# DigiReady — Project Rules & Architecture Guardrails

## 1. Project Purpose
**DigiReady** is a 30-hour hackathon concept prototype inspired by the document-wallet model of Indian public digital services. 
Citizens often have documents scattered across digital systems but struggle to know which documents are required for specific examinations or government services, whether their documents match requirements, whether details across documents are consistent, or how to resolve discrepancies. 

DigiReady introduces an "application readiness" layer that identifies required documents, checks user documents, detects missing files or inconsistencies, explains issues in simple language, and provides structured resolution guidance before actual application submission.

---

## 2. Strict Product Boundaries & Disclaimers
- **NOT an Official Product**: DigiReady is an independent concept prototype. It is NOT the official DigiLocker application and MUST NOT be presented as a government product.
- **No Government Branding**: Do not use official government logos, emblems, or imply government endorsement or affiliation.
- **Prohibition Against Live Government Systems**: Strictly forbidden to access, scrape, reverse-engineer, query, or interfere with any live government portals, APIs, or databases.
- **All External Integrations Mocked**: All external systems (DigiLocker, exam portals, verification authorities) must be completely simulated/mocked in software.

---

## 3. Privacy & Data Handling Rules
- **No Real Personal Data**: Never use real Aadhaar numbers, PAN numbers, OTPs, bank/payment details, passwords, biometric data, or genuine citizen PII.
- **Synthetic/Mock Data Only**: Use strictly synthetic, fictitious data for all test fixtures, document mocks, and demonstrations.
- **Ephemeral Document Analysis**: Document analysis operates on temporary session data.
- **Minimal Persistence**: The architecture is designed so sensitive document contents are not unnecessarily persisted to the database.

---

## 4. Architecture & Engineering Principles
- **Keep Architecture Simple**: Single Next.js application (App Router monolith). Do NOT introduce microservices or distributed complexities.
- **Deterministic Logic First**: Structured rules, schema validation, and deterministic validation must precede any AI.
- **Structured Requirements**: Government service requirements must be represented as structured data (Zod schemas / JSON / database records), never hardcoded directly into frontend components.
- **Multi-Service Scalability**: The core engine must be extensible to multiple services without rewriting frontend components.
- **Server-Side Security**: Any future AI APIs or external secrets must remain strictly server-side and never exposed to the client bundle.
- **No Over-Engineering**: Build only what is needed for the active phase.

---

## 5. Technology Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS
- **Database / ORM**: SQLite (local development) with Prisma ORM
- **Schema & Validation**: Zod
- **Testing**: Vitest
- **AI (Future Phases)**: OpenAI API (strictly server-side, gated by deterministic validation)

---

## 6. Phase-by-Phase Development Discipline
Development proceeds in strict, incremental phases. Features belonging to future phases must NOT be implemented prematurely.

- **Phase 1 — Foundation (Current)**: Scaffolding, configuration, Prisma + SQLite, Zod env validation, testing setup, health endpoint.
- **Phase 2 — Mock Data & Service Models**: Structured service requirements & mock document schemas.
- **Phase 3 — Deterministic Readiness Engine**: Rule evaluation, missing document detection, inconsistency checking.
- **Phase 4 — User Interface & Journey**: Document selection, readiness report visualization, step-by-step resolution guide.
- **Phase 5 — AI Explanation & Assist (Server-side)**: Plain-language translation of discrepancies and resolution guidance without hallucinating requirements.
- **Phase 6 — Review & Polishing**: End-to-end verification, performance, demo polish.
