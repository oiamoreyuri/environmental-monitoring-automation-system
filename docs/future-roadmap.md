# Future Roadmap

This roadmap reflects planned improvements grounded in real operational needs identified during deployment — not speculative feature additions. Each item has a defined motivation, a concrete implementation approach, and in some cases, infrastructure already partially in place.

Items are ordered by priority: operational independence and quick wins first, hardware-dependent and organizationally complex items last.

---

## 1. Externalized Configuration (SETTINGS Tab)

**Motivation:** Currently, all configuration parameters — equipment IDs, email addresses, WhatsApp numbers, Drive folder names, responsible person details — are hardcoded in the `CONFIG` and `ALERTA` objects inside `Codigo.js`. Any change requires opening the script editor and redeploying. This creates an unnecessary dependency on developer access for routine operational changes.

**Approach:** Create a `SETTINGS` tab in the Google Sheets spreadsheet. The script reads this tab once at initialization and populates the configuration objects dynamically. Changes to equipment lists, alert recipients, or responsible person details become spreadsheet edits — no code changes required.

**Impact:** Removes the bus factor for configuration changes. A quality manager can add a new equipment station or update an email address without touching the codebase. This is the highest-priority improvement because it reduces operational dependency on the original developer.

---

## 2. Approval UX — Loading Feedback

**Motivation:** The approval action involves multiple Drive API calls (hash lookup, PDF generation, file replacement) that take 4–5 seconds per equipment. The current UI disables the button and changes its label to "Aguarde..." but provides no progress indication. An operator unfamiliar with the latency may interpret the lack of feedback as a failure and attempt to re-trigger the action.

**Approach:** Add a visual progress indicator (spinner or progress bar) to the approval button while the `google.script.run` call is in flight. On completion, update the row status inline without a full page reload — the `withSuccessHandler` callback already receives the result and can update the DOM directly.

---

## 3. Temperature and Humidity Threshold Alerts

**Motivation:** The current system records all values without validation. Values outside acceptable ranges are only identified during manual report review. An out-of-range condition detected 12 hours late has different implications than one detected in real time.

**Approach:** Add threshold validation inside `onFormSubmit`. If `tempAtual`, `tempMax`, or `umidade` fall outside configurable ranges (defined per equipment zone in the SETTINGS tab), trigger an immediate alert via email and WhatsApp — separate from the completeness alerts already in place. Acceptable ranges are based on ambient temperature control standards per production area.

---

## 4. IoT Integration — Automatic Sensor Readings

**Motivation:** The current workflow requires manual form submission after each reading. Human factors — missed readings, delayed submissions, decimal input errors — are the primary source of data quality issues. Automating the collection layer eliminates these entirely for equipped stations.

**Approach:** ESP32 microcontrollers with DHT22 or SHT30 sensors, one per equipment station. Each device sends an HTTP POST to a new Apps Script endpoint (`?page=iot`) at configurable intervals. The endpoint validates the payload and appends directly to RAW_DATA.

**Infrastructure already in place:**
- The `FONTE` column in RAW_DATA already accepts `"iot"` as a value — the schema requires no changes
- The Apps Script WebApp routing already handles multiple `page` parameters and can be extended with a `doPost` handler
- LOG_INTEGRIDADE and the approval workflow are agnostic to data source — they operate on RAW_DATA regardless of how records were created

**Remaining work:** ESP32 firmware, `doPost` handler in Apps Script, device provisioning per equipment station.

---

## 5. Institutional Google Account Migration

**Motivation:** The system currently runs under a personal Google account. This creates a single point of failure: if the account owner leaves the organization, access to the spreadsheet, Apps Script project, Drive folder structure, and WebApp deployments is at risk.

**Approach:** Create a dedicated Google Workspace account for the Quality department. Transfer ownership of the spreadsheet, script, and Drive folders. Update the WebApp deployments under the new account. Update `CONFIG.responsavelEmail` and the approval signature reference.

**Dependencies:** Google Workspace admin access, internal IT coordination.

**Target:** Before the next FSSC 22000 surveillance audit cycle.

---

## 6. Looker Studio Dashboard

**Motivation:** Monthly PDF reports are appropriate for audit documentation but not for operational trend visibility. A dashboard connected directly to RAW_DATA would allow real-time monitoring of temperature trends, identification of seasonal patterns, and early detection of equipment drift — without requiring any new infrastructure.

**Approach:** Looker Studio connects natively to Google Sheets at no additional cost. A dashboard showing temperature and humidity trends per equipment station, with 30-day rolling windows and threshold reference lines, can be built and shared as a read-only link.

---

## What Is Not on the Roadmap

For completeness: several capabilities that might seem natural next steps were evaluated and deliberately excluded.

- **Database migration (PostgreSQL, Firestore):** Not justified by current scale. Google Sheets handles the current workload without performance issues. Migration would introduce infrastructure cost and operational complexity without proportional benefit at this data volume.
- **Containerized backend services:** Out of scope for the operational context. The zero-infrastructure constraint is a feature, not a limitation — it ensures the system remains maintainable by the quality team without external IT dependencies.
- **Mobile app:** The QR code + Google Forms workflow already provides a native mobile experience without requiring app installation or maintenance.
