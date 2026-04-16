# PHASES.md — Implementation Plan

## Overview

The project is broken into 5 phases, executed sequentially. Each phase produces a working increment. Tasks within a phase may run in parallel where dependencies allow.

### Roles

| Role | Responsibility |
|------|----------------|
| **Planner** | Requirements analysis, architecture decisions, task breakdown |
| **API Implementer** | Services, interceptors, models, API integration |
| **UI Implementer** | Components, templates, styles, routing |
| **Tester** | Unit tests, integration tests, visual verification |
| **Reviewer** | Code review, acceptance sign-off |

---

## Phase 1 — Foundation

Goal: Angular project scaffold, configuration, dev server running.

| Task ID | Title | Assignee | Dependencies | Acceptance Criteria |
|---------|-------|----------|--------------|---------------------|
| P1-01 | Analyse requirements and document spec | Planner | — | SPEC.md exists with functional requirements, data models, API contracts |
| P1-02 | Design architecture and document plan | Planner | P1-01 | PLAN.md exists with structure, component tree, data flow |
| P1-03 | Scaffold Angular 21 project | UI Implementer | P1-02 | `ng serve` starts without errors on port 4200 |
| P1-04 | Configure Tailwind CSS 4 | UI Implementer | P1-03 | `.postcssrc.json` present; `@import 'tailwindcss'` compiles; utility classes render |
| P1-05 | Configure Karma + Jasmine test runner | Tester | P1-03 | `ng test --no-watch` runs and exits 0 with no test files |
| P1-06 | Set up environment config | API Implementer | P1-03 | `environment.ts` contains `apiBaseUrl` and `apiKey` |
| P1-07 | Create directory structure | UI Implementer | P1-03 | `core/`, `shared/`, `features/` directories exist per PLAN.md |
| P1-08 | Configure Prettier | Reviewer | P1-03 | `.prettierrc` present; files pass `prettier --check` |

**Phase 1 exit criteria:** Dev server running, Tailwind rendering, test runner functional, directory structure in place.

---

## Phase 2 — Core Layer

Goal: Data models, services, and HTTP interceptor — all API communication functional and tested.

| Task ID | Title | Assignee | Dependencies | Acceptance Criteria |
|---------|-------|----------|--------------|---------------------|
| P2-01 | Define Customer model and list response interface | API Implementer | P1-06 | `customer.model.ts` exports `Customer` and `CustomerListResponse` |
| P2-02 | Define Subscription model and list response interface | API Implementer | P1-06 | `subscription.model.ts` exports `Subscription`, `SubscriptionListResponse`, `SubscriptionState` |
| P2-03 | Define Invoice model and list response interface | API Implementer | P1-06 | `invoice.model.ts` exports `Invoice`, `InvoiceListResponse`, `InvoiceState` |
| P2-04 | Implement auth interceptor | API Implementer | P1-06 | Requests to `api.frisbii.com` include `Authorization: Basic` header; other requests are untouched |
| P2-05 | Register interceptor in app config | API Implementer | P2-04 | `app.config.ts` calls `provideHttpClient(withInterceptors([authInterceptor]))` |
| P2-06 | Implement CustomerService | API Implementer | P2-01, P2-05 | `getCustomers(size, token, search)` hits `GET /list/customer` with correct params; `getCustomer(handle)` hits `GET /customer/:handle` |
| P2-07 | Implement SubscriptionService | API Implementer | P2-02, P2-05 | `getSubscriptions`, `getSubscription`, `putOnHold`, `reactivate` call correct endpoints |
| P2-08 | Implement InvoiceService | API Implementer | P2-03, P2-05 | `getInvoices`, `getInvoice` call correct endpoints |
| P2-09 | Implement ToastService | API Implementer | — | `show()`, `success()`, `error()`, `dismiss()` manage a `signal<Toast[]>`; auto-dismiss after 4s |
| P2-10 | Implement CurrencyFormatPipe | UI Implementer | — | `4900 \| currencyFormat:'DKK'` renders `DKK 49.00` |
| P2-11 | Write CustomerService unit tests | Tester | P2-06 | 6 tests: default list, search param, pagination, single get, error handling |
| P2-12 | Write SubscriptionService unit tests | Tester | P2-07 | 6 tests: list, on_hold, reactivate, single get, pagination |
| P2-13 | Write InvoiceService unit tests | Tester | P2-08 | 5 tests: list, single get, pagination, 404 |
| P2-14 | Write ToastService unit tests | Tester | P2-09 | 8 tests: show, success, error, dismiss, multiple, auto-dismiss, unique IDs |

**Phase 2 exit criteria:** All 4 services implemented. 25 unit tests passing. Auth interceptor verified via test.

---

## Phase 3 — Shared Components

Goal: Reusable UI components available for feature views.

| Task ID | Title | Assignee | Dependencies | Acceptance Criteria |
|---------|-------|----------|--------------|---------------------|
| P3-01 | Implement SidebarComponent | UI Implementer | P1-04 | Dark sidebar renders at 240px width; "Customers" nav link present; active route highlighted with `bg-blue-700` |
| P3-02 | Implement LoadingSpinnerComponent | UI Implementer | P1-04 | Centered spinner renders when included in template |
| P3-03 | Implement ErrorDisplayComponent | UI Implementer | P1-04 | Accepts `message` input; renders red error box with icon and message text |
| P3-04 | Implement StateBadgeComponent | UI Implementer | P1-04 | Accepts `state` and `type` inputs; renders pill with correct color per state-color mapping in SPEC |
| P3-05 | Implement ToastContainerComponent | UI Implementer | P2-09 | Reads `toastService.toasts()` signal; renders stacked toasts; dismiss button works; slide-in animation |
| P3-06 | Implement AppComponent (layout shell) | UI Implementer | P3-01, P3-05 | Renders sidebar on left, `<router-outlet>` on right, toast container overlay |

**Phase 3 exit criteria:** All shared components render correctly in isolation. Layout shell assembled.

---

## Phase 4 — Feature Views

Goal: All route-level views functional with live API data.

| Task ID | Title | Assignee | Dependencies | Acceptance Criteria |
|---------|-------|----------|--------------|---------------------|
| P4-01 | Define routes | UI Implementer | P3-06 | `/` redirects to `/customers`; `/customers` loads list; `/customers/:handle` loads detail; `**` loads 404 |
| P4-02 | Implement CustomerListComponent — data loading | UI Implementer | P2-06, P3-02, P3-03 | On mount, fetches first page from API; displays table with handle, name, email, company, created |
| P4-03 | Implement CustomerListComponent — search | UI Implementer | P4-02 | Text input with debounce; filters via `handle_contains`; `switchMap` cancels stale requests |
| P4-04 | Implement CustomerListComponent — infinite scroll | UI Implementer | P4-02 | IntersectionObserver on sentinel div; fetches next page when sentinel visible; `effect()` re-observes on DOM changes |
| P4-05 | Implement CustomerListComponent — search clear | UI Implementer | P4-03, P4-04 | Clear button resets list to unfiltered state; infinite scroll re-engages after clear |
| P4-06 | Implement CustomerListComponent — row navigation | UI Implementer | P4-01 | Clicking a row navigates to `/customers/:handle` |
| P4-07 | Implement CustomerDetailComponent — customer info | UI Implementer | P2-06, P3-02, P3-03 | Fetches customer by handle from route param; renders info card with all profile fields |
| P4-08 | Implement CustomerDetailComponent — breadcrumb | UI Implementer | P4-07 | Renders `Customers > :handle`; "Customers" links back to `/customers` |
| P4-09 | Implement CustomerDetailComponent — subscriptions table | UI Implementer | P2-07, P3-04 | Fetches subscriptions for customer; renders table with handle, state badge, plan, created, actions |
| P4-10 | Implement CustomerDetailComponent — invoices table | UI Implementer | P2-08, P3-04, P2-10 | Fetches invoices for customer; renders table with handle, state badge, formatted amount, created |
| P4-11 | Implement CustomerDetailComponent — infinite scroll (subs + invoices) | UI Implementer | P4-09, P4-10 | Both tables have their own sentinel and IntersectionObserver; load more pages independently |
| P4-12 | Implement pause/unpause actions | UI Implementer | P2-07, P2-09, P4-09 | Pause button on active subs; Unpause button on on_hold subs; optimistic UI; toast on success/error; revert on failure |
| P4-13 | Implement NotFoundComponent | UI Implementer | P4-01 | 404 text, link back to `/customers` |

**Phase 4 exit criteria:** All views render with live API data. Search, infinite scroll, and subscription actions work end to end.

---

## Phase 5 — Polish & Verification

Goal: Full test coverage, visual verification, documentation.

| Task ID | Title | Assignee | Dependencies | Acceptance Criteria |
|---------|-------|----------|--------------|---------------------|
| P5-01 | Add data-testid attributes to all interactive elements | UI Implementer | P4-* | Every button, link, input, table, section, and data row has a unique `data-testid` |
| P5-02 | Automated frontend test: structure and routing | Tester | P5-01 | Browser test verifies: sidebar renders, customer list loads, detail page loads, 404 page loads, routing works |
| P5-03 | Automated frontend test: live data flow | Tester | P5-02 | Browser test verifies: real customers appear, search filters, infinite scroll loads more, detail shows subs and invoices |
| P5-04 | ~~Visual regression check~~ | Tester | P5-03 | _Dropped — not implemented_ |
| P5-05 | Verify search clear + infinite scroll re-engagement | Tester | P4-05 | Flow test: load 10 → scroll to 20 → search → clear → verify 10 loaded → scroll to 20 again |
| P5-06 | Verify pause/unpause with toast feedback | Tester | P4-12 | Click Pause → state badge changes to ON HOLD → success toast appears; on API error → reverts + error toast |
| P5-07 | Write README.md | Planner | P5-03 | Setup, run, build, test instructions; link to architecture docs |
| P5-08 | Write architecture documentation | Planner | P5-03 | `docs/architecture.md` covering design decisions, patterns, tradeoffs |
| P5-09 | Final review | Reviewer | P5-* | All tests pass; no lint errors; no console errors; docs complete and consistent |

**Phase 5 exit criteria:** 25 unit tests passing. Automated frontend tests passing. Documentation complete. Project ready for submission.

---

## Dependency Graph (Simplified)

```
P1 (Foundation)
 └──> P2 (Core Layer)
       ├──> P3 (Shared Components)
       │     └──> P4 (Feature Views)
       │           └──> P5 (Polish & Verification)
       └──> P2 tests (parallel with P3)
```
