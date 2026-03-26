# Architecture

## Overview

This is a single-page Angular v21 application that consumes the [Frisbii Billing API](https://api.frisbii.com/v1) to provide a subscription management dashboard.  It is a **pure client-side application** — there is no backend server; all API calls go directly from the browser to the Frisbii REST API.

```
┌─────────────────────────────────────────────────┐
│  Browser (Angular SPA)                          │
│                                                 │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Customer   │  │ Customer   │  │ 404       │  │
│  │ List View  │  │ Detail View│  │ Not Found │  │
│  └─────┬──────┘  └─────┬──────┘  └───────────┘  │
│        │               │                        │
│  ┌─────▼───────────────▼──────────────────────┐ │
│  │         Service Layer (Singleton)          │ │
│  │  CustomerService  SubscriptionService      │ │
│  │  InvoiceService   ToastService             │ │
│  └─────────────────┬──────────────────────────┘ │
│                    │                            │
│  ┌─────────────────▼──────────────────────────┐ │
│  │  HTTP Client + Auth Interceptor            │ │
│  │  (adds Basic Auth header + retry logic)    │ │
│  └─────────────────┬──────────────────────────┘ │
└────────────────────┼────────────────────────────┘
                     │ HTTPS
                     ▼
          ┌──────────────────┐
          │  Frisbii API     │
          │  api.frisbii.com │
          └──────────────────┘
```

---

## Folder Structure

```
src/
├── app/
│   ├── core/                    # Singleton services, interceptors, models
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts    # Attaches Basic Auth + retry with backoff
│   │   ├── models/
│   │   │   ├── customer.model.ts      # Customer and list response interfaces
│   │   │   ├── subscription.model.ts  # Subscription and list response interfaces
│   │   │   └── invoice.model.ts       # Invoice and list response interfaces
│   │   └── services/
│   │       ├── customer.service.ts    # Customer API communication
│   │       ├── subscription.service.ts # Subscription API + lifecycle actions
│   │       ├── invoice.service.ts     # Invoice API communication
│   │       └── toast.service.ts       # Signal-based notification queue
│   ├── shared/                  # Reusable, domain-agnostic components
│   │   ├── components/
│   │   │   ├── sidebar.component.ts          # App shell navigation
│   │   │   ├── state-badge.component.ts      # Colour-coded state pills
│   │   │   ├── toast-container.component.ts  # Toast notification overlay
│   │   │   ├── loading-spinner.component.ts  # Generic spinner
│   │   │   └── error-display.component.ts    # Error message card
│   │   └── pipes/
│   │       └── currency-format.pipe.ts       # Minor-unit → formatted currency
│   ├── features/                # Feature-level views
│   │   ├── customers/
│   │   │   ├── customer-list/   # Searchable, paginated customer table
│   │   │   └── customer-detail/ # Customer info + subs + invoices
│   │   └── not-found/           # 404 catch-all
│   ├── app.ts                   # Root component (shell layout)
│   ├── app.config.ts            # Provider configuration
│   └── app.routes.ts            # Route table
├── environments/
│   └── environment.ts           # API URL + key (not committed in prod)
└── styles.scss                  # Global styles + Tailwind import
```

### Why This Folder Structure (Core / Shared / Features)?

The project follows Angular's recommended **modular architecture** pattern:

- **`core/`** contains singleton services, interceptors, and models that are instantiated once and shared across the entire app. Placing them here prevents accidental re-provision and makes it clear these are application-wide concerns (authentication, API communication, data models).

- **`shared/`** holds reusable, stateless components and pipes (`StateBadge`, `LoadingSpinner`, `ErrorDisplay`, `CurrencyFormatPipe`). These are presentation-only building blocks with no knowledge of business logic — any feature can import and use them. This avoids duplicating UI patterns across features.

- **`features/`** groups components by domain (`customers/`, `not-found/`). Each feature is self-contained and could be lazy-loaded in a larger app. This keeps the codebase navigable as it grows — a developer working on customer views only needs to look inside `features/customers/`.


| Layer | Purpose | Rule |
|-------|---------|------|
| `core/` | Singletons shared app-wide | One instance, provided in root |
| `shared/` | Reusable UI building blocks | Stateless, no API dependencies |
| `features/` | Views tied to routes | Can import from core/ and shared/ |

This keeps the dependency graph one-directional: **features → core/shared**, never the reverse.

### Why Standalone Components (No NgModules)?

Angular 21 fully supports standalone components as the default architecture. Using standalone components instead of NgModules was chosen because:

- **Reduced boilerplate**: No need for `@NgModule` declarations, imports arrays, or separate module files. Each component explicitly declares its own dependencies in its `imports` array, making the dependency graph self-documenting.
- **Better tree-shaking**: The bundler can eliminate unused components more effectively since there's no NgModule pulling in an entire group of declarations.
- **Angular 21 best practice**: The Angular team has made standalone the default in `ng generate` since v17. NgModules are still supported but are legacy-path for new projects.

---

## Key Patterns

### 1. Angular Signals for State Management

Every component uses `signal()` for mutable state and `computed()` for derived state instead of traditional class properties.  This gives us:

- **Fine-grained reactivity**: Angular only re-renders parts of the template that depend on changed signals.
- **No external state library**: Signals are built-in to Angular 21, keeping the dependency count low.

Example from `customer-list.component.ts`:
```typescript
customers = signal<Customer[]>([]);
loading   = signal(false);
totalLoaded = computed(() => this.customers().length);
```

### 2. RxJS Search Pipeline (Debounce → SwitchMap)

The customer search input uses a classic reactive pattern to avoid flooding the API:

```
User types → Subject.next()
              │
              ▼
         debounceTime(350ms)     ← Wait for typing to pause
              │
              ▼
         distinctUntilChanged()  ← Skip if value hasn't changed
              │
              ▼
         tap(reset state)        ← Clear list, show spinner
              │
              ▼
         switchMap(API call)     ← Cancel previous in-flight request
              │
              ▼
         subscribe(update UI)
```

`switchMap` is critical here: if the user types "abc" then quickly changes to "abcd", the request for "abc" is **cancelled** so stale results never overwrite fresh ones.

### 3. Optimistic UI for Subscription Actions

When the user clicks "Pause" or "Unpause":

1. **Immediately** update the subscription state in the signal → UI reflects the change instantly
2. Fire the API call in the background
3. On **success**: confirm with the server's authoritative state
4. On **failure**: **revert** to the previous state and show an error toast

This eliminates perceived latency and makes the app feel snappy.

```
User clicks "Pause"
  │
  ├─► UI: state = "on_hold"  (instant)
  │
  └─► API: POST /subscription/{handle}/on_hold
           │
           ├─ 200 OK  → confirm state, show success toast
           └─ Error   → revert to "active", show error toast
```

### 4. Infinite Scrolling via IntersectionObserver

Each scrollable list places an invisible sentinel `<div>` at the bottom.  An `IntersectionObserver` watches it:

```
┌─────────────────────┐
│  Visible rows       │
│  ...                │
│  Last visible row   │
├─────────────────────┤  ← Viewport boundary
│  ▓ Sentinel div     │  ← Observer triggers loadMore()
└─────────────────────┘
```

When ≥ 10% of the sentinel enters the viewport, `loadMore()` fires using the `next_page_token` from the previous API response.

**Challenge**: The sentinel `<div>` is wrapped in `@if (hasMore())`, so it gets created/destroyed dynamically.  The customer list component uses an `effect()` to re-attach the observer whenever the element reappears.  The customer detail component uses a `requestAnimationFrame` polling loop as a fallback.

### 5. HTTP Interceptor with Exponential Backoff

The `authInterceptor` (functional interceptor) handles two things:

1. **Auth**: Clones every Frisbii API request and adds `Authorization: Basic base64(key:)`.
2. **Retry**: On 429 (rate limit) or 5xx (server error), retries up to 3 times with exponential backoff (1s → 2s → 4s).  Client errors (401, 403, 404) propagate immediately.

```
Request → 429?/5xx? ──yes──► wait 1s → retry
                                        │
                                  429?/5xx? ──yes──► wait 2s → retry
                                                              │
                                                        429?/5xx? ──yes──► wait 4s → retry
                                                                                    │
                                                                              → give up, propagate error
                    ──no───► propagate error immediately
```

### 6. Toast Notification System

A lightweight, signal-based notification service:

- `ToastService.toasts` is a `signal<Toast[]>` — any component reading it re-renders automatically.
- Toasts auto-dismiss after 4 seconds via `setTimeout`.
- The `ToastContainerComponent` is placed once in the root `app.html` and renders as a fixed overlay.

---

## Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/` | → redirect | Redirects to `/customers` |
| `/customers` | `CustomerListComponent` | Searchable customer table |
| `/customers/:handle` | `CustomerDetailComponent` | Customer + subscriptions + invoices |
| `**` | `NotFoundComponent` | 404 catch-all |

The `withComponentInputBinding()` option in `app.config.ts` allows route parameters to be automatically bound to component inputs by name, though this project uses `ActivatedRoute.paramMap` for the reactive subscription pattern.

---

## State Colour Mapping

### Subscription States
| State | Colour |
|-------|--------|
| `active` | Green |
| `on_hold` | Amber |
| `cancelled` | Red |
| `expired` | Gray |

### Invoice States
| State | Colour |
|-------|--------|
| `settled` | Green |
| `authorized` | Blue |
| `pending` | Amber |
| `failed` | Red |
| `created` | Gray |

---

## Testing

Unit tests are in `*.spec.ts` files alongside the source files they test.  They use:
- **Jasmine** for assertions and test structure
- **Angular TestBed** for dependency injection
- **HttpTestingController** to mock HTTP requests

Run tests with:
```bash
npm test
```

Coverage includes all 4 services (CustomerService, SubscriptionService, InvoiceService, ToastService) and the auth interceptor — 40+ test cases covering happy paths, error codes (401/403/404/500), pagination, and toast lifecycle.