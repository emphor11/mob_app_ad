# SmartQuote

> Production-oriented mobile quotation and invoice management application for small businesses and freelancers (contractors, pipe dealers, electricians, fabricators, plumbers).

---

## 1. Project Purpose & Product Flow

SmartQuote simplifies the financial workflow of small service and trade businesses:
```
Business Profile → Customer → Quotation → Customer Accepts → Invoice → Payment Tracking → Payment Reminder
```

### Core Features (MVP)
- **Authentication**: Secure JWT-based auth with Argon2 password hashing
- **Business Profile**: Manage business identity, logo, address, and GSTIN
- **Customer Management**: Scoped customer directory with phone, email, and address
- **Quotations**: Line items, tax/discount calculation, status lifecycle (Draft, Sent, Accepted, Rejected), PDF generation & sharing
- **Invoice Conversion**: One-click immutable snapshot conversion from accepted quotation to invoice
- **Payment Tracking**: Record partial/full payments across Cash, UPI, Bank Transfer, Card; strict balance checks
- **Outstanding Tracker**: Automatic pending and overdue balance calculations
- **Payment Reminders**: Shareable customer reminder messages via WhatsApp / SMS / Email
- **Business Dashboard**: Overview metrics (Total Sales, Total Collected, Outstanding, Overdue)

---

## 2. Tech Stack

- **Mobile Client**: React Native with Expo (SDK 57), TypeScript, Expo Router, React Native StyleSheet, TanStack Query, React Hook Form, Zod, Expo SecureStore
- **Backend API**: Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, pwdlib (Argon2), PyJWT
- **Database**: PostgreSQL with UUID primary keys and `NUMERIC(12,2)` monetary precision
- **Architecture**: Decoupled Monorepo with RESTful API communication (`/api/v1`)

---

## 3. Repository Structure

```text
smartquote/
├── mobile/                  # React Native (Expo + TypeScript) mobile application
│   ├── src/
│   │   ├── app/             # Expo Router file-based navigation routes
│   │   ├── components/      # Reusable UI widgets and atomic components
│   │   ├── features/        # Domain features (customers, quotes, invoices, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Axios instance, QueryClient, SecureStore
│   │   ├── services/        # API network calls
│   │   ├── types/           # TypeScript contracts & interfaces
│   │   └── constants/       # Design tokens (colors, typography, spacing)
│   ├── app.json             # Expo configuration
│   ├── package.json
│   └── tsconfig.json
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/          # Versioned REST route controllers
│   │   ├── core/            # Config, security, database session
│   │   ├── db/              # SQLAlchemy Base and connection pooling
│   │   ├── models/          # SQLAlchemy 2.0 ORM data models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Authoritative business logic & calculations
│   │   ├── dependencies/    # Auth and DB dependency injection
│   │   └── main.py          # FastAPI application entrypoint
│   ├── migrations/          # Alembic database migration scripts
│   ├── tests/               # Pytest automated test suite
│   ├── requirements.txt
│   └── .env.example
├── docs/                    # Architecture diagrams and development guides
│   ├── architecture.md
│   └── development-rules.md
├── .env.example             # Root environment variable template
├── .gitignore
└── README.md
```

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js LTS (v20+ or v22+) & npm
- Python 3.11+ (Python 3.14 supported)
- PostgreSQL 14+ installed and running
- Expo Go app on a physical device, or Android Studio / Xcode simulator

---

### Step 1: Database Setup

Create a PostgreSQL database for the project:
```bash
# Using psql CLI:
createdb smartquote_db
# Or inside psql:
# CREATE DATABASE smartquote_db;
```

---

### Step 2: Backend Setup

1. Navigate to `backend/` and activate the virtual environment:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your local PostgreSQL password and JWT secret
```

4. Run the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API documentation will be available at `http://localhost:8000/docs`.

---

### Step 3: Mobile Setup

1. Navigate to `mobile/`:
```bash
cd mobile
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL:
# - iOS Simulator / Web: http://localhost:8000
# - Android Emulator:    http://10.0.2.2:8000
# - Physical Device:     http://<YOUR_LAN_IP>:8000
```

3. Start the Expo development server:
```bash
npx expo start
```

Press `a` to open Android Emulator, `i` to open iOS Simulator, or scan the QR code with Expo Go on your mobile phone.

---

## 5. Environment Variables Reference

| Variable | Scope | Description |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string (`postgresql+psycopg2://...`) |
| `JWT_SECRET` | Backend | High-entropy secret key for JWT signing |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | Access token lifetime (default: `60`) |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Backend | Refresh token lifetime (default: `30`) |
| `CORS_ORIGINS` | Backend | Whitelist of allowed client origins |
| `EXPO_PUBLIC_API_URL` | Mobile | Base URL of the backend API exposed to the mobile client |

> **Security Note**: Never expose database passwords, JWT secrets, or private keys to the mobile client bundle. Only `EXPO_PUBLIC_` variables are public.

---

## 6. Core Development Rules

1. **Backend is Authoritative**: All financial calculations (subtotals, discounts, taxes, totals, and balances) are computed and verified on the server.
2. **Multi-Tenant Scoping**: Queries must enforce `WHERE business_id = current_business`.
3. **Financial Immutability**: Issued invoices freeze line items by taking deep copies of quotation items.
4. **Exact Decimal Precision**: Monetary values strictly use `NUMERIC(12,2)` / Python `Decimal`, never IEEE floating-point numbers.
5. **UUID Identifiers**: Internal database records use UUIDs; human-facing numbers (`QT-YYYY-XXXX`, `INV-YYYY-XXXX`) are assigned sequentially.
