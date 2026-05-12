# Environmental Monitoring Automation System

Operational system for environmental monitoring of temperature and humidity in a regulated food manufacturing facility certified under **FSSC 22000**.

The project replaced a fully manual, paper-based monitoring process with an integrated digital workflow — from data collection to document approval and integrity verification.

---

## Overview

The system covers the full monitoring lifecycle:

- **Data collection** via QR code scanning and digital forms
- **Automated data processing** with normalization and centralized storage
- **Monthly report generation** with SHA-256 integrity hashing
- **Digital approval workflow** for the Quality Supervisor (PCQI)
- **Tamper-evident certificates** with approval signature and audit trail
- **Automated alerts** for incomplete monitoring records

---

## Core Features

| Feature | Description |
|---|---|
| QR Code identification | Each equipment has a unique QR that pre-fills the form |
| Google Forms integration | Mobile-friendly data entry with pre-populated fields |
| RAW_DATA pipeline | Normalized storage layer with fixed schema |
| Automated PDF reports | Generated on the last business day of each month |
| SHA-256 integrity | Every report gets a cryptographic hash stored in LOG_INTEGRIDADE |
| Approval web interface | Supervisor reviews and approves reports via browser |
| Approval certificates | PDF certificates with hash, approval block and signature |
| Hash verification page | QR on certificate links to live verification against LOG_INTEGRIDADE |
| Automated alerts | E-mail + WhatsApp notifications for missing records (9h and 15h) |
| Approval notifications | E-mail + WhatsApp sent automatically after PDF generation |
| Audit trail | Full traceability from scan to approved certificate |

---

## System Architecture

```
QR Code (equipment)
    │
    ▼
Apps Script WebApp (doGet)
    │  pre-fills id, date, time
    ▼
Google Forms
    │  onFormSubmit trigger
    ▼
RAW_DATA (Google Sheets)
    │  FILTER formulas
    ▼
Relatório Mensal (dynamic sheet)
    │  last business day trigger
    ▼
gerarPDFsMensais()
    ├── _Monitoramento.pdf  ──► SHA-256 ──► LOG_INTEGRIDADE
    └── _Certificado.pdf (pending approval)
            │
            ▼
    Approval page (?page=aprovacao)
            │  google.script.run
            ▼
    processarAprovacao_()
    ├── _Certificado_de_Aprovacao.pdf (with signature + hash)
    ├── LOG_INTEGRIDADE updated (APROVADO, DATA_APROVACAO)
    └── Verification page (?page=verify&hash=...&cod=...&mes=...&ano=...)
```

---

## Technologies

| Layer | Technology |
|---|---|
| Automation logic | Google Apps Script (JavaScript) |
| Data collection | Google Forms |
| Data storage | Google Sheets |
| Document generation | HTML → PDF via Drive API |
| Integrity hashing | SHA-256 (Utilities.computeDigest) |
| Alerts | Gmail API + CallMeBot WhatsApp API |
| Label printing | ZPL (Zebra Programming Language) |
| Version control | Git / GitHub |
| Development environment | Linux / clasp CLI |

---

## Project Structure

```
├── Codigo.js           # Main Apps Script — all backend logic
├── aprovacao.html      # Approval page HTML template
├── appsscript.json     # Apps Script manifest
├── .env.example        # Required configuration variables
├── docs/               # Project documentation
└── assets/             # Supporting assets
```

---

## Configuration

This repository uses placeholder values for all sensitive configuration. To deploy your own instance:

1. Copy `.env.example` and fill in your values
2. Update the `CONFIG` and `ALERTA` objects in `Codigo.js` with your actual IDs
3. Deploy as a Google Apps Script Web App
4. Configure triggers: `configurarTriggerForms()`, `configurarTriggerAlerta()`, `configurarTriggerMensal()`

See `.env.example` for the full list of required variables.

---

## Data Flow

Each monitoring record follows this path:

```
Operator scans QR  →  Form submission  →  onFormSubmit  →  RAW_DATA
                                                               │
                              Monthly FILTER formulas pull ◄──┘
                                        │
                              Relatório Mensal (dynamic)
                                        │
                              Last business day trigger
                                        │
                              PDF + SHA-256 + LOG_INTEGRIDADE
                                        │
                              Supervisor approves via browser
                                        │
                              Approval certificate generated
                                        │
                              Auditor scans QR  →  Verification page
```

---

## Compliance Context

The system was designed to support audit readiness under **FSSC 22000 v6** and **ISO 22000:2018**, with particular attention to:

- Clause 7.5 — Documented information and record control
- ALCOA++ principles for data integrity (Attributable, Legible, Contemporaneous, Original, Accurate)
- 21 CFR Part 11 alignment for electronic records

---

## Disclaimer

This repository contains a sanitized and anonymized version of a real operational system deployed in a regulated industrial environment. Sensitive identifiers, internal configurations and proprietary details have been replaced with placeholder values. The core logic, architecture and workflow are preserved as implemented.
