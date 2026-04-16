# PLAN.md — Architecture & Design Plan

## 1. Architecture Overview

Single-page Angular 21 application that communicates directly with the Frisbii REST API from the browser. No backend proxy or BFF layer. Authentication is handled client-side via an HTTP interceptor that injects Basic Auth headers.

```
Browser
  |
  |  HTTPS (Basic Auth)
  v
Frisbii API (api.frisbii.com/v1)
```

The app follows Angular's recommended standalone-component architecture: no NgModules, explicit imports per component, tree-shakable providers via `providedIn: 'root'`.

## 2. Project Structure

```
src/
├── main.ts                          # Bootstrap
├── index.html                       # HTML shell
├── styles.scss                      # Global styles (Tailwind + fonts)
├── environments/
│   └── environment.ts               # API base URL, API key
├── app/
│   ├── app.ts                       # Root component (layout shell)
│   ├── app.html                     # Root template
│   ├── app.scss                     # Root styles (empty — layout via Tailwind)
│   ├── app.config.ts                # Application providers
│   ├── app.routes.ts                # Route definitions
│   ├── core/                        # Singletons: services, interceptors, models
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   ├── models/
│   │   │   ├── customer.model.ts
│   │   │   ├── subscription.model.ts
│   │   │   └── invoice.model.ts
│   │   └── services/
│   │       ├── customer.service.ts
│   │       ├── subscription.service.ts
│   │       ├── invoice.service.ts
│   │       └── toast.service.ts
│   ├── shared/                      # Reusable presentational components and pipes
│   │   ├── components/
│   │   │   ├── sidebar.component.ts/html/scss
│   │   │   ├── state-badge.component.ts/html/scss
│   │   │   ├── toast-container.component.ts/html/scss
│   │   │   ├── loading-spinner.component.ts/html/scss
│   │   │   └── error-display.component.ts/html/scss
│   │   └── pipes/
│   │       └── currency-format.pipe.ts
│   └── features/                    # Route-level feature components
│       ├── customers/
│       │   ├── customer-list/
│       │   │   └── customer-list.component.ts/html/scss
│       │   └── customer-detail/
│       │       └── customer-detail.component.ts/html/scss
│       └── not-found/
│           └── not-found.component.ts/html/scss
```

### Layering rules

| Layer | May import from | Must not import from |
|-------|-----------------|----------------------|
| `core/` | `environments/` | `shared/`, `features/` |
| `shared/` | `core/` | `features/` |
| `features/` | `core/`, `shared/` | other features (no cross-feature imports) |

## 3. Component Tree

```
AppComponent
├── SidebarComponent
├── <router-outlet>
│   ├── CustomerListComponent
│   │   ├── LoadingSpinnerComponent
│   │   └── ErrorDisplayComponent
│   ├── CustomerDetailComponent
│   │   ├── LoadingSpinnerComponent
│   │   ├── ErrorDisplayComponent
│   │   ├── StateBadgeComponent (per subscription row)
│   │   └── StateBadgeComponent (per invoice row)
│   └── NotFoundComponent
└── ToastContainerComponent
```

All components are standalone. Parent-child communication uses Angular's `input()` signal function for data down, and direct service calls for actions.

## 4. Service Layer

Four injectable services, all `providedIn: 'root'`:

### CustomerService

| Method | Signature | API Call |
|--------|-----------|----------|
| `getCustomers` | `(size?, nextPageToken?, search?) → Observable<CustomerListResponse>` | `GET /list/customer` |
| `getCustomer` | `(handle) → Observable<Customer>` | `GET /customer/:handle` |

### SubscriptionService

| Method | Signature | API Call |
|--------|-----------|----------|
| `getSubscriptions` | `(customer, size?, nextPageToken?) → Observable<SubscriptionListResponse>` | `GET /list/subscription` |
| `getSubscription` | `(handle) → Observable<Subscription>` | `GET /subscription/:handle` |
| `putOnHold` | `(handle) → Observable<Subscription>` | `POST /subscription/:handle/on_hold` |
| `reactivate` | `(handle) → Observable<Subscription>` | `POST /subscription/:handle/reactivate` |

### InvoiceService

| Method | Signature | API Call |
|--------|-----------|----------|
| `getInvoices` | `(customer, size?, nextPageToken?) → Observable<InvoiceListResponse>` | `GET /list/invoice` |
| `getInvoice` | `(id) → Observable<Invoice>` | `GET /invoice/:id` |

### ToastService

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `(message, type) → void` | Push toast, auto-dismiss after 4s |
| `success` | `(message) → void` | Shorthand for `show(msg, 'success')` |
| `error` | `(message) → void` | Shorthand for `show(msg, 'error')` |
| `dismiss` | `(id) → void` | Remove toast by ID |

State is a `signal<Toast[]>` — no RxJS needed for UI-local notification state.

## 5. State Management

### Approach: Angular Signals (local component state)

No global store. Each route component owns its data:

```
CustomerListComponent
  customers      = signal<Customer[]>([])
  loading        = signal(false)
  loadingMore    = signal(false)
  error          = signal<string | null>(null)
  searchTerm     = signal('')
  nextPageToken  = signal<string | undefined>(undefined)
  hasMore        = signal(false)
  totalLoaded    = computed(() => customers().length)

CustomerDetailComponent
  customer             = signal<Customer | null>(null)
  subscriptions        = signal<Subscription[]>([])
  invoices             = signal<Invoice[]>([])
  actionLoading        = signal<Record<string, boolean>>({})
  + loading / error / hasMore signals for each section
```

### Why Signals over BehaviorSubject or NgRx

- **Scale**: Two route components, four services. NgRx adds indirection without benefit.
- **Reactivity**: Signals integrate with Angular's change detection without `async` pipe or manual subscription management.
- **Simplicity**: `signal()` and `computed()` are sufficient. No actions, reducers, selectors, or effects boilerplate.

RxJS is still used where it excels: HTTP calls, `debounceTime`, `switchMap`, `catchError`, `takeUntilDestroyed`.

## 6. Data Flow

### Search flow (Customer List)

```
User types → (ngModelChange) → searchTerm.set(value)
                              → searchSubject.next(value)
                                  |
                            debounceTime(350)
                                  |
                            distinctUntilChanged
                                  |
                            tap: reset state
                                  |
                            switchMap → CustomerService.getCustomers()
                                  |
                            subscribe → customers.set(response.content)
```

### Infinite scroll flow

```
hasMore() === true → render sentinel <div #scrollSentinel>
                          |
                    effect() detects viewChild element
                          |
                    IntersectionObserver.observe(sentinel)
                          |
                    sentinel enters viewport
                          |
                    loadMore() → service.getList(nextPageToken)
                          |
                    customers.update(prev => [...prev, ...new])
```

The `effect()` re-runs whenever the sentinel viewChild reference changes (appears/disappears from DOM), ensuring the observer re-attaches after state resets like search clear.

### Optimistic update flow (Pause/Unpause)

```
User clicks "Pause"
  → save previousState
  → immediately set state = 'on_hold' (optimistic)
  → set actionLoading[handle] = true
  → POST /subscription/:handle/on_hold
      |
      ├─ success → set state from response, show success toast
      └─ error   → revert to previousState, show error toast
  → set actionLoading[handle] = false
```

## 7. Styling Approach

### Tailwind CSS 4

- Global config via `@import 'tailwindcss'` in `styles.scss`
- PostCSS integration via `.postcssrc.json` with `@tailwindcss/postcss` plugin
- `@theme` block defines custom font families (`--font-sans`, `--font-mono`)
- All component styling uses Tailwind utility classes in templates
- Component `.scss` files are empty except `toast-container.component.scss` (slide-in keyframe animation)

### Design tokens (expressed via Tailwind classes)

| Element | Classes |
|---------|---------|
| Sidebar | `bg-gray-900`, active link `bg-blue-700 text-white` |
| Content background | `bg-gray-100` |
| Cards | `bg-white rounded-xl border border-gray-200` |
| Table headers | `bg-gray-50 text-gray-500 uppercase text-[11px]` |
| Handle text | `font-mono text-xs text-blue-700` |
| Active badge | `bg-green-100 text-green-800` |
| On-hold badge | `bg-amber-100 text-amber-800` |
| Failed badge | `bg-red-100 text-red-800` |
| Authorized badge | `bg-blue-100 text-blue-800` |

### Fonts

| Usage | Font | Weight |
|-------|------|--------|
| UI text | DM Sans | 300–800 |
| Handles, code | JetBrains Mono | 400–600 |

Loaded via Google Fonts CDN in `styles.scss`.

## 8. HTTP Interceptor

A single functional interceptor (`authInterceptor`) handles authentication:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiBaseUrl)) {
    return next(req.clone({
      setHeaders: {
        Authorization: 'Basic ' + btoa(environment.apiKey + ':'),
      },
    }));
  }
  return next(req);
};
```

- Only applies to requests targeting `api.frisbii.com`
- Registered via `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`

## 9. Tradeoffs & Assumptions

| Decision | Tradeoff | Rationale |
|----------|----------|-----------|
| No lazy loading | Larger initial bundle | Only 3 routes; total bundle < 135 kB. Complexity of lazy config not justified. |
| No global state management | State not shared across routes | Each route fetches its own data. No cross-route coordination needed. |
| `handle_contains` over `handle_prefix` | Broader results on short queries | Users expect "55" to find "cust-0055". Prefix requires knowing the full handle format. |
| Inline optimistic updates over saga/effect pattern | Simpler code, tighter coupling to component | Two actions total (pause/unpause). A saga pattern would add abstraction without reducing complexity. |
| Client-side API key | Key visible in browser | Challenge scope. Production would use a backend proxy or OAuth flow. |
| Retry with exponential backoff | Added complexity in interceptor | 429 and 5xx are transient; 3 retries with 1s→2s→4s backoff avoids manual refresh. Client errors (401/403/404) propagate immediately. |
| Cursor pagination over offset | Cannot jump to arbitrary page | Frisbii API uses cursor-based pagination natively. Infinite scroll aligns with the cursor model. |
| `effect()` for IntersectionObserver | Runs on every viewChild change | Necessary because the sentinel DOM element is conditionally rendered. `ngAfterViewInit` only fires once and misses re-renders. |
