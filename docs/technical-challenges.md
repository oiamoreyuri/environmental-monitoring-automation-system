# Technical Challenges

## Connectivity Constraints

One major challenge involved unstable wireless connectivity inside industrial operational areas.

Problems observed:

- weak Wi-Fi signal in specific sectors
- intermittent mobile connectivity
- delayed form submissions

Mitigation strategies:

- simplified form structure
- reduced submission complexity
- lightweight data payloads

---

## Data Sanitization

Operational users frequently inserted inconsistent numerical formats during manual input.

Examples:

- commas instead of decimal points
- incomplete temperature values
- invalid formatting patterns

To solve this problem, Python data-cleaning routines were implemented before report consolidation.

---

## Google Apps Script Limitations

The project required careful consideration regarding execution limitations from Google Apps Script infrastructure.

Challenges included:

- execution timeout limits
- concurrent execution restrictions
- automation trigger limitations

The architecture was adapted to remain lightweight and operationally stable.

---

## Traceability Reliability

A critical requirement was ensuring reliable operational traceability.

Important concerns:

- timestamp consistency
- equipment identification integrity
- operator accountability
- prevention of duplicated records

---

## Scalability Concerns

Although the initial implementation used lightweight infrastructure, scalability limitations were identified.

Potential future risks:

- spreadsheet performance degradation
- increased processing load
- growth in operational monitoring points

This motivated future planning for migration to more robust database architectures.

---

## Engineering Trade-offs

The solution intentionally prioritized:

- fast deployment
- operational simplicity
- low infrastructure cost
- maintainability
- reduced operational friction

instead of adopting overly complex enterprise infrastructure during the initial implementation phase.
