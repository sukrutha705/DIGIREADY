# DigiReady 🎯

> **Application Readiness Concept Prototype**  
> *Inspired by the document-wallet model of Indian public digital services.*

---

## 📌 About DigiReady

DigiReady is a hackathon prototype designed to bridge the gap between holding digital documents in a wallet and being application-ready for competitive examinations or public digital services (e.g., KCET, scholarships, income certificates, provident fund transfers, and passport applications).

Instead of citizens discovering missing documents, name order mismatches, or outdated certificates midway through an application portal, DigiReady proactively analyzes document readiness, flags discrepancies in plain language, and provides structured guidance to resolve issues before submission.

---

## 🛡️ Non-Negotiable Safety, Privacy & Architecture Principles

- **Independent Prototype**: DigiReady is **NOT** an official government product, is **NOT** the official DigiLocker application, and is not affiliated with or endorsed by any government authority.
- **No Live Access / Zero Scraping**: Live government systems, databases, and APIs are **NEVER** accessed or queried. All external interfaces are completely simulated.
- **Synthetic Data Only**: Operates strictly on synthetic mock data. Real Aadhaar numbers, PAN numbers, OTPs, payment credentials, or genuine citizen PII are strictly forbidden.
- **Ephemeral Document Verification**: Document binaries, PDFs, images, and raw OCR text are **NEVER** stored in the database. Document verification follows an ephemeral pipeline:
  $$\text{Temporary Buffer} \longrightarrow \text{In-Memory Processing} \longrightarrow \text{Verification \& Derived Metadata} \longrightarrow \text{Discard Content}$$
- **Deterministic First**: Rules, canonical ontology matching, and consistency engines make all decisions before AI assistance is introduced.

---

## 🏛️ System Architecture

```
                        CITIZEN
                           │
                           ▼
                 FUTURE AI AGENT
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     SERVICE KNOWLEDGE             DOCUMENT SOURCES
          LAYER                        LAYER
             │                           │
       ┌─────┴──────┐              ┌─────┴──────┐
       │            │              │            │
   Mock Source   Future API    Mock DigiLocker  Mock Issuer
       │            │              │            │
       └─────┬──────┘              └─────┬──────┘
             │                           │
             ▼                           ▼
       REQUIREMENTS                 DOCUMENT VAULT
             │                           │
             └─────────────┬─────────────┘
                           │
                           ▼
                    READINESS ENGINE
                           │
                           ▼
                   CONSISTENCY ENGINE
                           │
                           ▼
                    CITIZEN GUIDANCE
```

### 1. Service Knowledge Layer (`src/server/sources/`)
- Abstracted via `ServiceRequirementSource` interface.
- Decouples requirement lookup from data origins (`DatabaseServiceRequirementSource`, `MockGovernmentSource`, and future authorized official APIs).
- Driven entirely by database records (zero service-specific hardcoded branching).

### 2. Document Source Layer (`src/server/sources/document-sources/`)
- Abstracted via `DocumentSource` interface.
- Exposes available citizen documents via `MockDigiLockerSource` without coupling engines to Prisma-specific queries.

### 3. Readiness Engine (`src/server/readiness.ts`)
- Deterministically evaluates document presence against canonical `DocumentType` requirements.
- Distinguishes `REQUIRED`, `CONDITIONAL`, and `OPTIONAL` requirements.

### 4. Multi-Document Consistency Engine (`src/server/consistency.ts`)
- Evaluates metadata consistency across $N$ documents for a citizen.
- **Conservative Name Rule**: Token order is strictly preserved (`"SUKRUTHA K"` vs `"K SUKRUTHA"` produces a `NAME_MISMATCH` warning).
- Normalizes date of birth formats to canonical `YYYY-MM-DD` (`DOB_MISMATCH` critical finding on conflict).
- Checks parent/guardian names (`PARENT_NAME_MISMATCH` critical finding on conflict).
- Checks synthetic document expiry dates (`DOCUMENT_EXPIRED` warning).
- Checks core expected metadata (`MISSING_EXPECTED_FIELD` warning).
- Consolidates multi-document conflicts into single, deduplicated findings.

---

## 💡 Future UX Vision — "Check & Get Help" Floating Assistant

> **Note**: The frontend UI is deferred to subsequent phases.

In the final product, the citizen uses a normal DigiLocker-style document wallet. An optional floating assistant (`"DigiReady — Check & Get Help"`) sits near the bottom of the interface.

When clicked:
1. **Intent**: Citizen types `"I want to apply for KCET"` or `"I need an income certificate"`.
2. **Service Discovery**: Service Knowledge Layer retrieves canonical requirements.
3. **Readiness Evaluation**: Readiness Engine checks the citizen's document vault.
4. **Consistency Verification**: Consistency Engine verifies name, DOB, and parent details across documents.
5. **Guidance**: Explains missing/conflicting documents in plain language and guides the citizen on next steps without forcing them out of their wallet experience.

---

## 🚀 Project Status & Phase Breakdown

- [x] **Phase 1: Foundation** (Next.js, Prisma + SQLite, Zod Env, Vitest, Health Endpoint)
- [x] **Phase 2: Document Vault & Ontology** (Canonical Document Types, Aliases, Demo User Vault)
- [x] **Phase 3: Service Knowledge & Requirements** (Generic Service Engine, Provenance)
- [x] **Phase 4: Application Readiness Engine** (Deterministic Requirement Matching)
- [x] **Phase 5: Architecture Hardening & Consistency Engine** (Identity Evidence, Mock Sources, Consistency Engine)
- [ ] **Phase 6: AI Citizen Service Agent (Server-Side)**
- [ ] **Phase 7: Citizen-Facing DigiLocker-Style UI**
- [ ] **Phase 8: End-to-End Integration & Verification**
- [ ] **Phase 9: Demo Polish & Hackathon Presentation**

---

## 🏃 Getting Started

### 1. Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### 2. Setup & Database Initialization
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Run Development Server
```bash
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- Health Check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
