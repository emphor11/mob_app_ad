# SmartQuote Engineering Principles & Development Rules

These rules govern the implementation of SmartQuote to maintain high reliability and clean code.

---

### Rule 1 — The Backend is the Authoritative Source of Truth
The mobile application computes prices, subtotals, taxes, and balances purely for instant UI feedback. The FastAPI backend recalculates and validates every figure upon receipt. Client values are never stored without backend verification.

### Rule 2 — Strict Tenant Isolation
Every database query involving customer, quotation, invoice, or payment data must be scoped to the authenticated business:
```sql
WHERE business_id = :authenticated_business_id
```
A request supplying an arbitrary `business_id` from the client must be ignored or rejected.

### Rule 3 — Financial Immutability & Snapshots
When an accepted quotation is converted into an invoice, all line items are deep-copied into dedicated `invoice_items` records. If the source quotation is edited or annotated subsequently, the issued invoice remains untouched.

### Rule 4 — Money Uses Exact Decimals
Never use floating-point types (`float` in Python or `REAL` / `DOUBLE PRECISION` in SQL) for monetary values. Always use:
- Database: `NUMERIC(12,2)`
- Backend: Python `Decimal`
- Frontend: Strict fixed-decimal formatting helpers

### Rule 5 — UUID Primary Keys with Business Identifier Prefixes
All database records use UUIDv4 primary keys internally. Human-readable identifiers are generated sequentially by the backend:
- Quotations: `QT-YYYY-XXXX`
- Invoices: `INV-YYYY-XXXX`

### Rule 6 — Security & Secrets Management
- Passwords are never stored in plaintext; use `pwdlib` with Argon2.
- Session tokens use short-lived JWT access tokens and secure refresh tokens.
- Sensitive environment variables (`DATABASE_URL`, `JWT_SECRET`) must never exist in the mobile bundle.
- Only variables prefixed with `EXPO_PUBLIC_` are allowed in the mobile configuration.

### Rule 7 — Incremental, Tested Milestones
Every feature is implemented within its designated phase, tested, reviewed, committed, and pushed before subsequent features are added.
