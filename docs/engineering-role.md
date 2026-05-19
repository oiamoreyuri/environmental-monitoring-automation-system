# Engineering Role

## Who Built This

This system was designed, developed, and deployed by a single engineer with an uncommon professional profile: a **Biomedical Scientist with an MSc in Human/Medical Genetics (UNICAMP)**, currently completing a **Computer Engineering degree (UNIVESP)**, working as **Quality Control Supervisor and PCQI (Preventive Controls Qualified Individual)** in a food manufacturing facility certified under FSSC 22000.

This profile is relevant because it shaped every technical decision in the project. The engineer who built the system is also the person who operates it daily, understands the regulatory constraints it must satisfy, and is accountable for its audit readiness. There was no requirements handoff, no domain translation layer, and no gap between what the system does and what the operation actually needs.

---

## Contributions

**System architecture and design**
Defined the full data flow from QR code scan to approved PDF certificate, including the RAW_DATA schema, LOG_INTEGRIDADE structure, WebApp routing, and approval workflow. All architectural decisions were made with zero-cost infrastructure as a hard constraint.

**Backend development (Google Apps Script / JavaScript)**
Implemented all server-side logic: `onFormSubmit` data pipeline, `gerarPDFsMensais` batch processing, `processarAprovacao_` approval workflow, `doGetVerificacao` hash verification endpoint, completeness alert system, and approval notification system.

**Debugging and problem resolution**
Identified and resolved six non-trivial technical issues during development — each involving a silent failure mode that required systematic diagnosis:
- Cross-origin iframe sandbox blocking `google.script.run` communication
- Google Sheets silently converting string values to Date objects
- Apps Script private function convention (`_` suffix) making functions invisible to `google.script.run`
- Device locale variance causing decimal separator inconsistency in numeric fields
- Raster QR code degradation on thermal printers, resolved by migrating to native ZPL
- Drive API rate limiting during batch PDF generation, resolved with retry logic

Full diagnostic and solution details are documented in [technical-challenges.md](technical-challenges.md).

**Document integrity system**
Designed and implemented the SHA-256 hashing pipeline, LOG_INTEGRIDADE schema, approval certificate generation, and live hash verification page — creating a tamper-evident audit trail aligned with ALCOA++ principles.

**Label printing system**
Designed and generated ZPL (Zebra Programming Language) files for equipment identification labels, replacing a PNG-based workflow that produced degraded output on thermal printers.

**Compliance alignment**
Mapped system features to regulatory requirements: ISO 22002-1 PRP controls, ISO 22000:2018 clause 7.5 documented information, and ALCOA++ data integrity principles. Ensured the digital approval workflow satisfies PCQI accountability requirements under FSSC 22000.

**Documentation**
Wrote all technical documentation in this repository, including architecture diagrams, debugging case studies, business impact analysis, and this roadmap.

---

## Technology Stack

| Technology | Role |
|---|---|
| Google Apps Script (JavaScript) | Entire backend — automation, PDF generation, WebApp, alerts |
| Google Sheets | Structured data storage (RAW_DATA, LOG_INTEGRIDADE) |
| Google Forms | Mobile-friendly data collection interface |
| Google Drive API | PDF storage, file management, temporary HTML-to-PDF conversion |
| Gmail API | Automated alert and notification emails |
| CallMeBot API | WhatsApp notifications |
| SHA-256 (Utilities.computeDigest) | Document integrity hashing |
| ZPL (Zebra Programming Language) | Equipment label generation for thermal printer |
| clasp CLI | Local development and version control sync with Apps Script |
| Git / GitHub | Version control and portfolio documentation |
| Linux / zsh | Development environment |

---

## What This Project Demonstrates

**Domain-driven engineering**: The system solves a real compliance problem in a regulated environment. Every feature exists because it was operationally necessary — not because it was technically interesting.

**Constraint-driven architecture**: Zero additional infrastructure cost was a hard requirement, not a preference. The architecture was designed around this constraint from the start, leveraging existing Google Workspace tools to deliver a system with capabilities comparable to commercial LIMS/MES solutions at no marginal cost.

**Debugging under ambiguity**: Several of the technical challenges involved silent failure modes — no error thrown, no log entry, incorrect behavior with no obvious cause. Resolving them required systematic hypothesis testing and understanding of the underlying platform internals (Apps Script execution model, Sheets data type coercion, browser cross-origin policy).

**End-to-end ownership**: Design, implementation, debugging, deployment, documentation, and daily operation — by the same person. This is not a portfolio project built for demonstration purposes. It runs in production every working day.
