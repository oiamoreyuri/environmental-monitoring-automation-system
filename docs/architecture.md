# System Architecture

```mermaid
flowchart TD

A[Operator<br/>Mobile Device]
--> B[QR Code Identification]

B --> C[Pre-configured Digital Form<br/>Google Forms]

C --> D[Cloud Storage<br/>Google Sheets]

D --> E[ETL Processing<br/>Python Scripts]

E --> F[Operational Reports]

E --> G[Trend Analysis]

E --> H[Audit Readiness]
```

## Architecture Goals

* low operational friction
* high traceability
* audit readiness
* low-cost infrastructure
* workflow reliability
* scalable automation pipeline

⸻

## Reliability Considerations

The architecture was designed to reduce manual transcription steps and improve operational traceability while maintaining low infrastructure complexity.
