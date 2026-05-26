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
- **Dynamic document control** (SGSAQ) with revision and effective date tracking

---

## Core Features

| Feature | Description |
|---|---|
| QR Code identification | Each equipment has a unique QR that pre-fills the form |
| Google Forms integration | Separate forms for production (temp + humidity) and lab (temp only) |
| RAW_DATA pipeline | Normalized storage layer with fixed 12-column schema |
| SETTINGS configuration | Centralized equipment config — limits, documents, alerts |
| Automated PDF reports | Generated on the last business day of each month |
| SHA-256 integrity | Every report gets a cryptographic hash stored in LOG_INTEGRIDADE |
| Approval web interface | Supervisor reviews and approves reports via browser |
| Approval certificates | PDF certificates with hash, approval block and signature |
| Hash verification page | QR on certificate links to live verification against LOG_INTEGRIDADE |
| Automated alerts | E-mail + WhatsApp notifications for missing records (9h and 15h) |
| N/A compliance | Lab equipment without hygrometer displays "N/A" instead of blank cells |
| Dynamic document control | Document code, revision and effective date pulled from SETTINGS |
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
Google Forms (production or lab)
    │  onFormSubmit trigger
    ▼
RAW_DATA (Google Sheets)
    │  FILTER formulas + N/A handling
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
├── Config.gs           # Global constants, PropertiesService, SETTINGS loader
├── WebApp.gs           # HTTP routing (doGet/doPost), zero business logic
├── QrCode.gs           # QR Code scanning, access logging, HTML pages
├── Forms.gs            # Form response normalization, RAW_DATA ingestion
├── Pdf.gs              # Monthly PDF generation, Drive organization, triggers
├── Utils.gs            # Pure utility functions — no I/O, no sheet access
├── Certificado.gs      # Approval certificates, PCQI workflow, verification
├── Integridade.gs      # SHA-256 hashing, LOG_INTEGRIDADE
├── Notificacoes.gs     # Completeness alerts, PDF approval notifications
├── Triggers.gs         # Trigger creation and removal
├── Dev.gs              # Test suite and diagnostic functions (not triggered)
├── Api.gs              # REST-like API endpoints via doGet
├── aprovacao.html      # Approval page HTML template
├── appsscript.json     # Apps Script manifest
├── .env.example        # Required configuration variables
├── CONTEXT.md          # Full project briefing for development agents
├── CHANGELOG.md        # Chronological engineering change log
├── docs/               # Project documentation
└── assets/             # Supporting assets
```

---

## Configuration

This repository uses placeholder values for all sensitive configuration. To deploy your own instance:

1. Copy `.env.example` and fill in your values
2. Run `setupPropriedades()` in `Config.gs` to populate PropertiesService
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
