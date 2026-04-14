# Anima Triage Demo

A production-grade triage intake and clinician dashboard built to demonstrate familiarity with Anima's exact stack: **Angular · AWS Lambda · DynamoDB · API Gateway · TypeScript**.

Built by a nurse who codes. I spent 10+ years as an ICU/ER nurse in the US and Greek healthcare systems before transitioning into software engineering. This project isn't an approximation of clinical workflow — it's built from lived experience of what a triage handoff actually needs to communicate.

---

## What it does

| Route | Who uses it | What it does |
|---|---|---|
| `/intake` | Patient | Submits chief complaint, onset, severity (1–10), allergies, de-identified initials |
| `/dashboard` | Clinician | Sees all cases sorted by severity, can advance status, sort by any column |

On submission, the backend stores the data shaped as a **FHIR R4 Bundle containing an Observation resource** — not a raw JSON blob. SNOMED CT and LOINC codes are used for chief complaint and severity score respectively. This is how real clinical data exchange works.

---

## Stack

### Frontend
- **Angular 18** — standalone components, no NgModules (modern pattern, not 2019-tutorial Angular)
- **Reactive Forms** with typed `FormBuilder` and `Validators` — interface safety at the data boundary
- **Tailwind CSS** — pragmatic, no component library overhead
- **Angular Signals** — for component state (`submitState`, `loadState`, `cases`)
- **Lazy-loaded routes** — `/intake` and `/dashboard` are separate code-split chunks
- **Deployed on Vercel** with SPA routing via `vercel.json`

### Backend
- **AWS Lambda** (Node.js 20, TypeScript, ARM64/Graviton2)
  - `POST /triage` — validates, builds FHIR R4 bundle, writes to DynamoDB
  - `GET /triage` — scans table, returns cases sorted by severity desc
  - `PATCH /triage/{caseId}/status` — advances case status (new → in-progress → resolved)
- **DynamoDB** — `triage-submissions` table, `caseId` (UUID) as partition key, on-demand billing, encryption at rest
- **API Gateway HTTP API** — CORS configured per-origin, not wildcard in production
- **AWS SAM** (`template.yaml`) — full Infrastructure as Code; one command to deploy the entire backend

### Mirrors Anima's production stack
Anima's JD lists: *Angular, React, Electron — fully serverless AWS (Cognito, AppSync GraphQL, Lambda, DynamoDB)*

This demo uses **HTTP API Gateway** instead of AppSync GraphQL for deployment simplicity. In production, I would reach for AppSync + subscriptions for real-time dashboard updates (new cases appearing without manual refresh). Authentication would be gated behind **Cognito** — the same auth Anima uses — with the clinician dashboard protected by a Cognito User Pool authorizer on the API Gateway.

---

## FHIR R4 Data Model

Each submission is stored as a FHIR R4 Bundle in DynamoDB alongside flat fields for query efficiency:

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "timestamp": "2026-04-14T10:30:00.000Z",
  "entry": [{
    "resource": {
      "resourceType": "Observation",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "preliminary",
      "category": [{
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }]
      }],
      "code": {
        "coding": [{
          "system": "http://snomed.info/sct",
          "code": "418799008",
          "display": "Finding reported by subject or history provider"
        }],
        "text": "Chest pain on exertion"
      },
      "subject": { "display": "J.D." },
      "effectiveDateTime": "2026-04-14T10:30:00.000Z",
      "component": [
        {
          "code": {
            "coding": [{
              "system": "http://loinc.org",
              "code": "72514-3",
              "display": "Pain severity - 0-10 verbal numeric rating [Score]"
            }]
          },
          "valueInteger": 8
        },
        {
          "code": {
            "coding": [{
              "system": "http://snomed.info/sct",
              "code": "57797005",
              "display": "Duration of symptoms"
            }]
          },
          "valueString": "today"
        }
      ]
    }
  }]
}
```

This is not FHIR for show. Storing data in this shape from day one means it can be transmitted to or consumed by any EHR that speaks HL7 (EMIS, SystmOne — both of which Anima integrates with) without a transformation layer.

---

## Project structure

```
anima-triage-demo/
├── src/
│   ├── app/
│   │   ├── intake/
│   │   │   ├── intake.component.ts        # Reactive Form, signal-based state
│   │   │   ├── intake.component.html      # Angular 18 @if/@for control flow
│   │   │   └── intake.component.spec.ts   # 10 unit tests: form validation + submit
│   │   ├── dashboard/
│   │   │   ├── dashboard.component.ts     # Load, sort, status advancement
│   │   │   ├── dashboard.component.html   # Sortable table, severity colour coding
│   │   │   └── dashboard.component.spec.ts  # 13 unit tests
│   │   ├── shared/
│   │   │   ├── triage.models.ts           # FHIR R4 interfaces — shared source of truth
│   │   │   ├── triage-api.service.ts      # HTTP client wrapping all 3 endpoints
│   │   │   └── status-count.pipe.ts       # Standalone pipe for dashboard summary bar
│   │   ├── app.routes.ts                  # Lazy-loaded routes
│   │   ├── app.config.ts                  # provideHttpClient, provideRouter
│   │   └── app.component.ts              # Nav shell
│   └── environments/
│       ├── environment.ts                 # Dev (API Gateway URL)
│       └── environment.prod.ts            # Production (same, baked at build time)
├── lambda/
│   ├── shared/types.ts                    # Shared TypeScript interfaces
│   ├── submit/index.ts                    # POST handler + FHIR bundle builder
│   ├── fetch/index.ts                     # GET handler + server-side severity sort
│   ├── update-status/index.ts             # PATCH handler with DynamoDB condition expression
│   ├── package.json
│   └── tsconfig.json
├── template.yaml                          # AWS SAM — IaC for entire backend
├── vercel.json                            # SPA rewrite rule
└── README.md
```

---

## Running locally

### Frontend
```bash
npm install
npx ng serve
# → http://localhost:4200
```

### Backend (requires AWS SAM CLI + AWS credentials)
```bash
cd lambda && npm install
cd ..
sam build
sam local start-api --port 3000
# API available at http://localhost:3000
```

### Deploy backend to AWS
```bash
sam build
sam deploy --guided
# Follow prompts. Note the ApiUrl output, paste into environment.ts
```

### Deploy frontend to Vercel
Push to GitHub, connect repo to Vercel. The API URL is configured in
`src/environments/environment.prod.ts` and baked into the production build.

---

## Tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
# 25 specs, 0 failures
```

Test coverage includes:
- Form validation (required fields, minlength, pattern, severity range)
- Submission success and error states
- Dashboard load, error, and empty states
- Severity colour mapping (green 1-3 / amber 4-6 / red 7-10)
- Status badge advancement cycle (new → in-progress → resolved → new)
- Column sort direction toggling

---

## What is intentionally omitted (and why)

| Feature | Notes |
|---|---|
| **Auth** | Production would use Cognito User Pool + API Gateway authorizer on the dashboard route. Omitted to keep this deployable in 10 minutes. |
| **Real-time updates** | AppSync subscriptions or API Gateway WebSockets would push new intakes to the clinician dashboard instantly. Manual refresh here for simplicity. |
| **Pagination** | DynamoDB Scan with pagination tokens for tables over 1MB. Not relevant at demo scale. |
| **Audit log** | Production clinical systems need immutable audit trails. DynamoDB Streams → Lambda → S3 is the standard pattern. |

