# Engineering Role

## Executive Summary

This project delivers a **compliance automation platform** for environmental monitoring in a regulated food manufacturing facility — replacing a fully manual, paper-based process with an integrated digital workflow that covers data collection, automated report generation, cryptographic document integrity, digital approval, and real-time authenticity verification.

The system functions as:
- a **regulatory workflow engine** — orchestrating the full monitoring lifecycle from QR code scan to audit-ready approved certificate
- a **document integrity platform** — using SHA-256 hashing and a tamper-evident audit trail aligned with ALCOA++ principles
- a **zero-marginal-cost compliance platform** — delivering selected capabilities commonly found in commercial LIMS and MES systems, at no additional infrastructure cost

**Operational impact since deployment:**
- ~308 monitoring records processed per month across 10 equipment stations and 2 daily shifts
- 20 audit-ready documents generated and approved automatically each month
- Monthly approval cycle reduced from **5 days to same-day processing**
- Paper forms eliminated entirely — all records are digital, timestamped, and tamper-evident
- Monitoring time reduced by **67%** (30 min → 10 min per daily cycle)
- Zero additional infrastructure cost — built on existing Google Workspace tools already available in the organization

---

## Who Built This

This platform was designed, developed, and deployed by a single engineer with an uncommon professional profile: a **Biomedical Scientist with an MSc in Human/Medical Genetics (UNICAMP)**, currently completing a **Computer Engineering degree (UNIVESP)**, working as **Quality Control Supervisor and PCQI (Preventive Controls Qualified Individual)** in a food manufacturing facility certified under FSSC 22000.

This profile shaped every decision in the project. The engineer who built the system is also the person who operates it daily, understands the regulatory constraints it must satisfy, and is accountable for its audit readiness. There was no requirements handoff, no domain translation layer, and no gap between what the system does and what the operation actually needs.

---

## Contributions

**Platform architecture and design**
Defined the full compliance workflow — from QR code scan to tamper-evident approved certificate — including the RAW_DATA ingestion schema, LOG_INTEGRIDADE integrity ledger, WebApp routing, and multi-step approval pipeline. All architectural decisions were made with zero marginal infrastructure cost as a hard constraint.

**Modular codebase design (v2)**
Refactored the initial monolithic implementation (~700 lines, single file) into 11 modules with isolated responsibilities and explicit dependency documentation. The refactoring corrected three latent bugs caused by unintended scope interactions, eliminated function duplication across modules, and centralized 14 utility functions into a pure-function module with no I/O dependencies. Full details: [refactoring-v2.md](refactoring-v2.md).

**Workflow automation engine**
Implemented the complete server-side automation: real-time data ingestion pipeline (`onFormSubmit`), batch document generation (`gerarPDFsMensais`), approval processing (`processarAprovacao_`), completeness monitoring with dual-channel alerts (email + WhatsApp), and post-generation approval notifications.

**Document integrity system**
Designed and implemented the SHA-256 hashing pipeline, integrity ledger (LOG_INTEGRIDADE), approval certificate generation, and live hash verification endpoint — creating a tamper-evident audit trail where any post-generation document modification is immediately detectable.

**Approval interface**
Built the PCQI approval web interface with dynamic month/year selection derived from LOG_INTEGRIDADE, inline table updates via `google.script.run`, and real-time approval status without page reloads.

**Debugging and platform internals**
Identified and resolved seven non-trivial failures during development, each involving a silent failure mode requiring systematic diagnosis:
- Cross-origin iframe sandbox blocking server communication
- Sheets silently coercing string values to Date objects
- Platform-level function visibility constraints breaking the approval bridge
- Device locale variance corrupting numeric fields at ingestion
- Raster image degradation on thermal printers, resolved by migrating to native ZPL
- API rate limiting during batch processing, resolved with retry logic
- Monolithic scope causing three latent bugs, resolved by full compartmentalization

Full diagnostic and solution details: [technical-challenges.md](technical-challenges.md).

**Compliance alignment**
Mapped every system feature to regulatory requirements: ISO 22002-1 PRP environmental controls, ISO 22000:2018 clause 7.5 documented information, ALCOA++ data integrity principles, and FSSC 22000 PCQI accountability requirements.

**Label printing system**
Designed and generated ZPL (Zebra Programming Language) files for equipment identification labels, replacing a raster-based workflow that produced degraded output on thermal printers.

**Documentation**
Authored all technical documentation in this repository: architecture diagrams, debugging case studies, business impact analysis, compliance mapping, and roadmap.

---

## Implementation Stack

The platform runs entirely on Google Workspace infrastructure — no external servers, no additional licenses, no infrastructure to maintain.

| Component | Implementation |
|---|---|
| Workflow automation engine | Google Apps Script (JavaScript) — 11 modules |
| Operational data store | Google Sheets (RAW_DATA, LOG_INTEGRIDADE) |
| Data collection interface | Google Forms |
| Document storage and generation | Google Drive API |
| Alert delivery — email | Gmail API |
| Alert delivery — WhatsApp | CallMeBot API |
| Cryptographic integrity | SHA-256 via Utilities.computeDigest |
| Equipment label generation | ZPL (Zebra Programming Language) |
| Local development sync | clasp CLI |
| Version control | Git / GitHub |
| Development environment | Linux / zsh |

---

## What This Project Demonstrates

**Compliance-first engineering:** Every feature in this platform exists because it was required by the regulatory environment — not because it was technically interesting. The SHA-256 audit trail, the PCQI approval workflow, the tamper-evident certificates — each maps to a specific compliance requirement.

**Enterprise-grade outcomes without enterprise infrastructure:** The platform delivers document integrity, audit trail, automated approval workflow, and real-time authenticity verification — capabilities typically found in commercial LIMS or MES systems costing USD 3,000–15,000/year — at zero marginal cost, by fully leveraging existing organizational infrastructure.

**Systematic debugging under ambiguity:** Seven of the technical challenges involved silent failure modes — no exception thrown, no log entry, incorrect behavior with no obvious cause. Resolution required understanding platform internals: Apps Script execution model, Sheets data type coercion, browser cross-origin policy, thermal printer rasterization, V8 hoisting behavior.

**Codebase engineering under growth pressure:** The initial monolithic implementation worked but accumulated latent bugs and became difficult to modify safely as features were added. Recognizing the inflection point and executing a structured refactoring — correcting bugs, eliminating duplication, documenting dependencies — without breaking a production system is a distinct engineering skill from initial implementation.

**End-to-end ownership:** Architecture, implementation, debugging, refactoring, deployment, compliance mapping, documentation, and daily operation — by the same person. This is not a portfolio project built for demonstration purposes. It runs in production every working day.
