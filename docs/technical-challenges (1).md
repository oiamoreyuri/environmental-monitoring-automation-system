# Technical Challenges

This document describes real engineering challenges encountered during development, how each was diagnosed, and the solution implemented. These are not theoretical concerns — each one caused a production failure that required debugging and a concrete fix.

---

## 1. Cross-Origin Iframe Sandbox Blocking Approval Communication

**Context:** The approval web interface is served by Google Apps Script's HtmlService, which renders inside a `googleusercontent.com` iframe sandbox.

**Problem:** Both `fetch()` calls and direct link navigation targeting `script.google.com` are blocked by the browser's cross-origin policy when initiated from within the sandbox. The approval button appeared to work — no JavaScript error was thrown — but the server-side function was never called. The failure mode was silent.

**Diagnosis:** Multiple approaches failed before the root cause was identified: `fetch()` with the WebApp URL returned a network error; `window.open()` with `_blank` opened a tab that was immediately blocked; link navigation with `target="_top"` caused a "connection refused" error. All pointed to the same constraint: the sandbox context prevents outbound requests to a different Google subdomain.

**Solution:** `google.script.run` — Google's official HtmlService bridge for calling server-side functions from within the sandbox. It communicates through an internal postMessage channel rather than HTTP, bypassing the cross-origin restriction entirely. The approval button calls `google.script.run.withSuccessHandler(...).aprovarRelatorio(cod, mes, ano)` directly.

---

## 2. Google Sheets Silently Converting String to Date Object

**Context:** `LOG_INTEGRIDADE` stores a `MES_ANO` field populated as `mesFormatado + "/" + ano` — e.g. `"04/2026"`.

**Problem:** The hash lookup in `processarAprovacao_` compared `logDados[i][2] === "04/2026"` and always returned no match, causing every approval attempt to throw "Registro não encontrado". The data was visually correct in the spreadsheet — the cell displayed `04/2026` — but the comparison consistently failed.

**Diagnosis:** `getValues()` returns the raw JavaScript type of each cell, not the display string. Google Sheets had silently interpreted `"04/2026"` as a date and stored it internally as a Date object (`2026-04-01T03:00:00.000Z`). The cell format displayed it as `04/2026`, masking the type mismatch. String comparison against a Date object always returns false.

**Solution:** Added type detection before comparison using `instanceof Date`. When the stored value is a Date, `Utilities.formatDate(cell, timezone, "MM/yyyy")` normalizes it to the expected string format before comparison — making the lookup format-agnostic regardless of how Sheets chooses to interpret the cell.

```javascript
var mesAnoStr = (mesAnoCell instanceof Date)
  ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
  : String(mesAnoCell).trim();
```

---

## 3. Private Functions Invisible to google.script.run

**Context:** The approval server-side logic was implemented in `processarAprovacao_()` — following Apps Script's convention of using a trailing underscore to mark functions as internal/private.

**Problem:** `google.script.run.processarAprovacao_(cod, mes, ano)` failed silently. The `withSuccessHandler` callback received `false` (the error return value), but no exception was thrown and no server-side log entry was generated — as if the function had been called and returned false immediately.

**Diagnosis:** Apps Script enforces function visibility at the `google.script.run` API boundary: functions with a trailing underscore are excluded from the callable surface. The call was being silently dropped before reaching the function body — which is why no log entry appeared. This behavior is documented but easy to miss, especially when the failure mode produces no error.

**Solution:** A thin public wrapper function `aprovarRelatorio(cod, mes, ano)` that delegates to the private implementation. This preserves the internal naming convention while exposing a clean public API surface to `google.script.run`.

```javascript
function aprovarRelatorio(cod, mes, ano) {
  return processarAprovacao_(cod, mes, ano);
}
```

---

## 4. Decimal Separator Variance by Device Locale

**Context:** Operators use personal mobile devices to submit monitoring records via Google Forms. Temperature values are numeric free-text fields.

**Problem:** Devices with non-Brazilian locale settings (or physical keyboards with numeric pads) submit decimal values with a period separator — e.g. `23.5` instead of `23,5`. Google Sheets in PT-BR interprets period-separated decimals as text strings rather than numbers, causing the `FILTER` formula in the monthly report to return empty results or incorrect values for affected records.

**Diagnosis:** Records from one operator consistently showed as blank in the report despite appearing correctly in RAW_DATA. Inspecting the cell type revealed `23.5` was stored as text, not a number. The `DATEVALUE + FILTER` formula pipeline treats non-numeric values in numeric columns as non-matches.

**Solution:** Normalization at ingestion time inside `onFormSubmit`, before the value reaches RAW_DATA:

```javascript
function normalizarDecimal_(val) {
  if (!val) return "";
  return String(val).trim().replace(".", ",");
}
```

This makes the storage layer locale-independent regardless of the operator's device settings. Historical records affected before the fix were corrected manually.

---

## 5. Raster QR Code Degradation on Thermal Printer

**Context:** Equipment identification labels include a QR code linking to the monitoring form. Initial implementation generated QR codes as PNG images via `api.qrserver.com` and printed through ZebraDesigner.

**Problem:** Printed labels showed visible QR module degradation — uneven edges, inconsistent module sizes — reducing scan reliability. The issue was reproducible and consistent across all labels.

**Diagnosis:** Thermal printers render raster images by mapping pixel values to dot patterns at a fixed DPI. A PNG generated at 90×90 pixels, when scaled to fit a label at 203 DPI, undergoes resampling that introduces artifacts at the module boundaries. The QR reader interprets degraded modules as ambiguous, increasing scan failure rate.

**Solution:** Migration to ZPL (Zebra Programming Language). ZPL instructs the printer's internal firmware to generate the QR code natively using the `^BQN` command — the printer's rasterizer produces crisp vector output at the target DPI without any image scaling. Labels are generated programmatically as `.zpl` files with the equipment URL embedded directly in the QR command.

```zpl
^FO210,100^BQN,2,7^FDQA,https://script.google.com/.../exec?id=COD-1040^FS
```

---

## 6. Drive API Rate Limiting During Batch PDF Generation

**Context:** `gerarPDFsMensais()` loops through 10 equipment IDs, generating a monitoring PDF and an approval certificate for each — 20 Drive API calls in sequence.

**Problem:** Intermittent `429 Too Many Requests` errors from the Drive API during batch execution, causing the loop to fail mid-run and leaving some equipment without generated reports.

**Diagnosis:** The Drive API enforces per-user rate limits on file creation and export operations. Sequential calls without delay saturate the quota bucket within a few iterations.

**Solution:** Retry logic with exponential backoff inside the loop. When a `429` error is detected, the current iteration index is decremented and a 10-second sleep is inserted before retrying:

```javascript
} catch(err) {
  if (err.message.indexOf("429") !== -1) {
    Logger.log("⏳ Rate limit em " + cod + " — aguardando 10s...");
    Utilities.sleep(10000);
    i--;
  } else {
    erros.push(cod + ": " + err.message);
  }
}
```

A 4-second `Utilities.sleep()` between iterations was also added as a preventive measure to reduce the rate of API calls during normal execution.

---

## 7. Monolithic Codebase Causing Latent Bugs and Maintenance Risk

**Context:** The initial implementation kept all backend logic in a single file (`Codigo.js`, ~700 lines) — HTTP routing, business logic, PDF generation, cryptographic hashing, notifications and trigger management in a single scope.

**Problem:** As the system grew, three bugs emerged from unintended scope interactions, and maintenance became increasingly risky because any change required reading the entire file to understand impact radius:

- `CONFIG` was never initialized as a global variable. `getConfig()` existed but its return value was never assigned. All `CONFIG.*` references depended on an undefined global — a bug that was masked by the fact that Apps Script re-executes the file on every invocation, making the unassigned reference behave inconsistently across execution contexts.
- `gerarPdfCertificado_` was defined inside the `try/catch` block of `processarAprovacao_`, making it a local function. `gerarPDFsMensais` called it as a global, which worked only due to V8 hoisting behavior of function declarations inside blocks — undefined behavior that could break silently under any runtime change.
- `notificarAprovacao_` was defined twice: once nested inside `gerarPDFsMensais` (unreachable) and once at global scope. Both definitions had diverged in content, creating a silent inconsistency.

**Diagnosis:** The bugs were identified during a structured code review conducted as part of the v2 refactoring process. None had triggered runtime errors — each was masked by incidental platform behavior that happened to compensate for the underlying defect.

**Solution:** Full compartmentalization into 11 modules with isolated responsibilities, explicit dependency documentation in each file header, and correction of all three bugs. Additionally:

- `calcularHash_()` was refactored to accept raw bytes instead of a Blob object, eliminating a redundant `blob.getBytes()` call and decoupling the function from the Apps Script type system.
- `verificarCompletude_()` was migrated from reading "Respostas ao formulário 1" to reading RAW_DATA, making it consistent with the rest of the system and eliminating a hidden dependency on the raw Forms response sheet.
- 14 utility functions scattered across modules were extracted into `Utils.gs` as pure functions, eliminating duplication and making filename construction and data formatting consistent across the codebase.

Full details of the refactoring: [refactoring-v2.md](refactoring-v2.md).
