# Business Impact

## Context

Environmental temperature and humidity monitoring is a mandatory operational control in food manufacturing facilities certified under FSSC 22000. Before this system, the process relied entirely on paper forms, manual transcription to spreadsheets, and physical file storage — a workflow that introduced transcription errors, created audit gaps, and consumed significant operator and supervisor time daily.

---

## Operational Efficiency

The monitoring workflow covers 7 equipment stations per shift, twice daily (morning and afternoon), totaling 14 records per working day across 2 operators plus supervisor verification.

| Metric | Before | After | Reduction |
|---|---|---|---|
| Time per full monitoring cycle | ~30 min | ~10 min | **67%** |
| Manual transcription steps | 3 (paper → spreadsheet → file) | 0 | **100%** |
| Supervisor verification time | Manual cross-check | Automated alert + digital approval | **~80%** |
| Monthly report preparation | Manual compilation | Automatic PDF generation | **100%** |

At 20 working days per month, the 20-minute daily reduction across the team represents approximately **6–7 hours recovered per month** — time redirected to higher-value quality activities.

---

## Zero-Cost Infrastructure

The entire system runs on tools already available in the organization's existing Google Workspace subscription. No additional software licenses were required.

| Component | Tool | Additional Cost |
|---|---|---|
| Data collection interface | Google Forms | R$ 0 |
| Cloud database | Google Sheets | R$ 0 |
| Automation backend | Google Apps Script | R$ 0 |
| Document storage | Google Drive | R$ 0 |
| E-mail notifications | Gmail API | R$ 0 |
| WhatsApp alerts | CallMeBot API | R$ 0 |
| Equipment labels | ZPL on existing Zebra printer | R$ 0 |
| Version control | GitHub (public repository) | R$ 0 |
| **Total additional infrastructure cost** | | **R$ 0** |

For reference, commercial LIMS (Laboratory Information Management Systems) or MES (Manufacturing Execution Systems) with equivalent functionality typically require R$ 15.000–80.000/year in licensing fees plus implementation costs. This system delivered comparable operational coverage at zero marginal cost by fully leveraging existing infrastructure.

---

## Compliance and Audit Readiness

The system was designed around ALCOA++ data integrity principles from the ground up — not retrofitted after the fact.

The monitoring activity itself is classified as a **Prerequisite Program (PRP)** under **ISO 22002-1:2009** — specifically the control of environmental conditions (temperature and humidity) in production and storage areas, required as a food safety prerequisite under **FSSC 22000 v6**.

> **Note:** "Environmental Monitoring" in FSSC 22000 clause 2.5.7 refers specifically to microbiological monitoring of the manufacturing environment — a separate program. This system addresses the physical parameter monitoring (temperature and humidity) required as a PRP under ISO 22002-1.

**Traceability improvements:**
- Every record is timestamped at submission, not at transcription — eliminating the gap between observation and registration
- Each operator is identified by name on every record, enforced by the form
- Equipment identity is pre-filled via QR code — eliminating misidentification errors
- Monthly reports are locked as PDFs with SHA-256 hashes at generation time — any post-generation modification is detectable
- The digital approval workflow creates a named, timestamped approval record tied to the PCQI identity

**Audit cycle improvement:**
Before, preparing records for an audit required locating physical files, verifying completeness manually, and compiling data across multiple sources. Now, the auditor scans a QR code on any certificate and receives an instant authenticity verification against the live LOG_INTEGRIDADE — from any device, without accessing internal systems.

---

## Scalability Without Additional Cost

The architecture was designed to scale without increasing infrastructure spend:

- Adding a new equipment requires one line in the `equipamentosValidos` array and one QR code label — no database migrations, no new licenses
- IoT integration (automatic sensor readings via ESP32) is planned and the data schema already reserves the `FONTE` field for this — the transition from manual to automated collection will require no structural changes to the storage layer
- The system currently monitors 10 equipment stations and can scale to any number within Google Apps Script's execution constraints

---

## Engineering Philosophy

This project was built under a deliberate constraint: solve a real operational compliance problem with zero additional budget, using only tools already available in the organization.

This constraint drove several architectural decisions — using Google Sheets as a structured data store instead of a database, leveraging Apps Script triggers instead of a dedicated backend, generating PDFs via the Drive API instead of a document service. Each decision traded engineering convenience for zero marginal cost, while maintaining the traceability and integrity requirements of a regulated environment.

The result is a system that a team of two operators and one quality supervisor runs daily without technical assistance — which is the actual measure of whether automation succeeded.
