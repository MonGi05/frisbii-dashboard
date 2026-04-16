# Frisbii Subscription Management Dashboard

An Angular v21 subscription management dashboard that integrates with the Frisbii Billing & Pay API. Allows viewing customers, subscriptions, invoices, and performing subscription lifecycle operations (pause/unpause).

## Setup Instructions

### Prerequisites

- Node.js v20.19+ or v22.12+ or v24+
- npm (v11+)
- Chromium or Chrome (for running unit tests)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd frisbii-dashboard

# Install dependencies
npm install
```

### Configuration

Copy the environment template and add your API key:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Then edit `src/environments/environment.ts` with your actual key:

```typescript
export const environment = {
  apiBaseUrl: 'https://api.frisbii.com/v1',
  apiKey: 'priv_your_actual_key_here',
};
```

> **Important:** `environment.ts` is gitignored — your API key will never be committed. Only the placeholder `environment.example.ts` is tracked in git.


### Running the Application

```bash
# Development server
npm start

# Run unit tests
npm test

# Build for production
npm run build

# E2E tests (Playwright)
npm run e2e              # Live API
npm run e2e:mocked       # Offline, mocked API data
```

The app runs at `http://localhost:4200` by default.

## Features Implemented

### Core

- **Customer List** — paginated table with Handle, Name, Email, Company, Created date
- **Customer Search** — search by handle with debounced input (`handle_contains` API parameter)
- **Customer Detail** — full customer info card (email, company, phone, address, country, created)
- **Subscriptions Table** — per-customer list with Handle, State badge, Plan, Created, action buttons
- **Invoices Table** — per-customer list with Handle, State badge, Amount (currency-formatted), Created
- **Pause/Unpause Subscriptions** — action buttons for `active` → on hold and `on_hold` → reactivate
- **Navigation** — sidebar with active route highlighting, breadcrumbs on detail page
- **Routing** — `/customers`, `/customers/:handle`, wildcard 404 page
- **Loading & Error States** — spinner during data fetch, error card with contextual messages for 401/403/404/429/500

### Bonus

- **Infinite Scrolling** — on all three lists (customers, subscriptions, invoices) using `IntersectionObserver` with signal-based sentinel re-attachment via `effect()`
- **Optimistic UI** — pause/unpause updates state immediately, reverts on API failure
- **HTTP Interceptor** — functional interceptor for Basic Auth + retry with exponential backoff (429/5xx)
- **Toast Notifications** — success/error toasts with auto-dismiss on subscription actions
- **Unit Tests** — 77 unit tests across 9 spec files (Karma/Jasmine), covering services, interceptor, components (customer-list, customer-detail, state-badge), and pipes (currency-format)
- **E2E Tests** — Playwright tests covering customer list, search, and detail navigation, with a mocked-API profile for offline/CI runs
- **Breadcrumb Navigation** — on customer detail page with link back to list
- **Prettier** — consistent code formatting across all source files
- **Tailwind CSS** for utility-first styling

## Architecture Decisions

See the full [Architecture document](docs/ARCHITECTURE.md).

## Design System

- **Tailwind CSS v4** for utility-first styling — no custom CSS files needed for most components.
- **Dark sidebar** with light content area creates clear visual hierarchy.
- **State badges** use color-coded pills with consistent mapping:

**Subscription States:**

- `active` → Green
- `on_hold` → Amber
- `cancelled` → Red
- `expired` / `Unknown` → Gray

**Invoice States:**

- `settled` → Green
- `authorized` → Blue
- `pending` → Amber
- `failed` → Red
- `created` / `Unknown` → Gray

## Assumptions Made

1. **All subscriptions for a customer share the same currency** — the subscription table does not display per-row currency since the API returns it per subscription but the UI groups them visually without currency headers
2. **Plan handles are sufficient for display** — the subscriptions table shows raw plan handles (e.g. `p-1773839057594`) instead of resolving them to human-readable plan names via the Plan API. A `PlanService` could be added to map handles to names
3. **Invoice and subscription states are exhaustive as documented** — the challenge lists specific states (`active`, `cancelled`, `expired`, `on_hold` for subscriptions; `created`, `pending`, `settled`, `authorized`, `failed` for invoices). Any state outside these lists is displayed as "UNKNOWN" with a neutral gray badge
4. **Users have a single private API key** — the app uses one API key configured in `environment.ts` and does not support multi-account or key rotation
5. **No concurrent modification by other users** — optimistic UI updates assume no one else is pausing/unpausing the same subscription simultaneously. In a multi-user scenario, the confirmed API response state would take precedence over the optimistic update

## Challenges Faced

1. **Infinite scroll with Signals**: Angular's `viewChild` signal for the sentinel element required an `effect()` to re-observe the element when it appears/disappears from the DOM (e.g., when switching between loading and loaded states).

2. **Optimistic UI state management**: Needed careful handling to track the "previous state" per subscription handle so that concurrent actions on different subscriptions don't interfere with each other's rollback logic.

3. **Retry and rate limiting behaviour**: Implementing exponential backoff in the HTTP interceptor (for 429/5xx only) while letting 401/403/404 fail fast required a clear separation between transient and non‑transient errors.

## Environment Requirements

- Node.js >= 20.19.0
- Angular CLI 21.x
- Chromium or Chrome (for unit tests)
- Modern browser (Chrome, Firefox, Safari, Edge)

## AI Usage Disclosure

Yes, AI assistance was used during development.

I used three tools:
- **Claude Code (Agent Teams)** to scaffold the Angular project, generate boilerplate for routing, services, components and some styling helpers, and to propose a structured plan with distinct roles (Planner, API Implementer, UI Implementer, Tester, Reviewer).
- **Claude inside Perplexity** to prompt‑engineer Claude Code (for better task prompts, constraints, and review instructions) and to search the web (Angular docs, Stack Overflow, and Frisbii docs) to confirm patterns and fix edge cases.
- **GitHub Copilot** as a reasoning assistant to discuss architecture, Angular 21 + Signals patterns, Frisbii API integration, and to refine some code snippets and documentation.

In particular, Claude’s agent team drafted the initial planning documents for this project:
- [**SPEC.md**](docs/SPEC.md) — Functional specification defining scope, features, and requirements
- [**PLAN.md**](docs/PLAN.md) — Proposed architecture and design plan
- [**PHASES.md**](docs/PHASES.md) — 5-phase implementation plan with deliverables and defined roles (Planner, API Implementer, UI Implementer, Tester, Reviewer) 

I reviewed these documents, accepted the overall direction, and then implemented the app against them, correcting details where they diverged from the real Frisbii API or from the final code.

Typical prompts included:
- “Generate an Angular 21 project for a subscription management dashboard using the Frisbii API, with Signals for state management and dedicated services for customers, subscriptions and invoices.”
- “Create typed Angular HttpClient services for the Frisbii API, using an auth interceptor with Basic auth from environment variables and proper error handling.”
- “Propose a clean folder structure (core / features / shared) and a simple Signals‑based store for a customer list with loading and error states.”
- “Help draft the README sections explaining architecture decisions and AI usage for this coding challenge.”

For a longer, more complete list of prompts and AI interactions, see [**PROMPTS.md**](docs/PROMPTS.md) in the repository.

**What went well**
- Fast scaffolding of repetitive boilerplate (project structure, routing setup, service and model skeletons).
- Helpful suggestions for organizing state with Signals, composing RxJS operators for HTTP requests, and structuring feature modules.
- Accelerated drafting of documentation (README structure, architecture notes and planning docs like SPEC/PLAN/PHASES).

**What did not work perfectly**
- In a few places, Claude suggested non-idiomatic solutions (for example, using extra polling logic where a more reactive approach was possible). I caught these during review and refactored them to match the final architecture.
- Some generated code and plans did not match the Frisbii API exactly (endpoints, parameters, response types) and had to be corrected after checking the official documentation.
- A few suggestions were over‑engineered.

All AI‑generated snippets and documents were reviewed, adapted and tested manually to ensure they compile, follow Angular 21 conventions, and meet the challenge requirements (no API keys in source control, proper loading/error handling, etc.).