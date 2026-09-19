# SmartQuote Architecture & System Design

SmartQuote is an offline-ready, production-oriented mobile quotation and invoice management application built for freelancers and trade contractors.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────┐
│     React Native Mobile App     │
│       Expo + TypeScript         │
│   Expo Router (File-based)      │
│ TanStack Query + React Hook Form│
└────────────────┬────────────────┘
                 │ HTTPS REST (/api/v1)
                 ▼
┌─────────────────────────────────┐
│           FastAPI API           │
│       Python 3.14 + Pydantic    │
│    JWT Auth + Argon2 (pwdlib)   │
└────────────────┬────────────────┘
                 │ SQLAlchemy 2.0 (Mapped / mapped_column)
                 ▼
┌─────────────────────────────────┐
│       PostgreSQL Database       │
│  Alembic Migrations + UUID PKs  │
│     NUMERIC(12,2) for Money     │
└─────────────────────────────────┘
```

---

## 2. Core Business Flow

```
Business Profile
   ↓
Customer
   ↓
Quotation (Draft → Sent → Accepted/Rejected)
   ↓ (On Accepted)
Convert to Invoice (Immutable Line-Item Snapshot)
   ↓
Payment Tracking (Cash, UPI, Bank, Card)
   ↓
Outstanding Balance Calculation
   ↓
Payment Reminder (WhatsApp / SMS / Email)
```

---

## 3. Separation of Concerns

### Frontend (`mobile/`)
- `src/app/`: Expo Router routes and layouts **only**.
- `src/components/`: Atomic and composite UI components (buttons, text, inputs, cards, sheets).
- `src/features/`: Feature modules (e.g. auth, customers, quotations, invoices, payments).
- `src/hooks/`: Custom hooks for state, sensors, and theme.
- `src/lib/`: Configured Axios client, TanStack Query client, SecureStore wrappers.
- `src/services/`: Typed API network calls.
- `src/types/`: Domain models and TypeScript contracts.
- `src/constants/`: Colors, typography, spacing, layout metrics.

### Backend (`backend/`)
- `app/api/v1/`: API route controllers grouped by domain (auth, customers, quotations, invoices, payments).
- `app/core/`: Configuration (`pydantic-settings`), security (Argon2, JWT), database engine.
- `app/db/`: Base class and session lifecycle handlers.
- `app/models/`: SQLAlchemy 2.0 ORM models with `Mapped[...]` and `mapped_column(...)`.
- `app/schemas/`: Pydantic models for request validation and response serialization.
- `app/services/`: Pure business logic and financial calculation routines.
- `app/dependencies/`: Dependency injection providers for authentication and database sessions.
- `migrations/`: Version-controlled database schema migrations managed by Alembic.
