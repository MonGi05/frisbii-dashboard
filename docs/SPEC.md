# SPEC.md — Frisbii Subscription Management Dashboard

## 1. Purpose

A browser-based dashboard for managing subscription billing data through the Frisbii (Billwerk+) REST API. The target user is a Frisbii account operator who needs to browse customers, inspect their subscriptions and invoices, and perform lifecycle actions (pause / unpause) on individual subscriptions.

## 2. Scope

### In scope

| Area | Description |
|------|-------------|
| Customer list | Paginated, searchable list of all customers in the account |
| Customer detail | Single-customer view showing profile fields, related subscriptions, and related invoices |
| Subscription actions | Pause (put on hold) and unpause (reactivate) an active or on-hold subscription |
| Search | Substring match on customer handle (`handle_contains`) |
| Pagination | Cursor-based infinite scrolling on all list views |
| Error handling | Graceful display of API errors (auth, validation, rate-limit, server) |
| Notifications | Toast messages for action success and failure |
| Routing | Deep-linkable URLs for list, detail, and 404 |

### Out of scope

- Customer creation, update, or deletion
- Subscription creation or cancellation
- Invoice settlement or refund actions
- Plan management
- Multi-account or multi-user authentication
- Server-side rendering (SSR)
- Internationalisation (i18n)

## 3. Functional Requirements

### FR-1: Customer List

| ID | Requirement |
|----|-------------|
| FR-1.1 | On load, fetch the first page of customers (size = 10) from `GET /v1/list/customer` |
| FR-1.2 | Display each customer in a table row showing: handle, full name, email, company, created date |
| FR-1.3 | Provide a text input that filters results via the `handle_contains` query parameter |
| FR-1.4 | Debounce search input by 350 ms; cancel in-flight requests on new input |
| FR-1.5 | When a `next_page_token` is present in the response, render a scroll sentinel and fetch the next page when it enters the viewport |
| FR-1.6 | Clicking a row navigates to `/customers/:handle` |
| FR-1.7 | Clearing the search field resets the list to an unfiltered first page and re-engages infinite scroll |

### FR-2: Customer Detail

| ID | Requirement |
|----|-------------|
| FR-2.1 | Fetch the customer via `GET /v1/customer/:handle` |
| FR-2.2 | Display: avatar initials, full name, handle, email, company, phone, full address, country, created date |
| FR-2.3 | Fetch the customer's subscriptions via `GET /v1/list/subscription?customer=:handle` |
| FR-2.4 | Fetch the customer's invoices via `GET /v1/list/invoice?customer=:handle` |
| FR-2.5 | Display subscriptions in a table: handle, state badge, plan, created date, action column |
| FR-2.6 | Display invoices in a table: handle, state badge, formatted amount with currency, created date |
| FR-2.7 | Both tables support cursor-based infinite scroll |
| FR-2.8 | Show breadcrumb navigation: `Customers > :handle` |

### FR-3: Subscription Actions

| ID | Requirement |
|----|-------------|
| FR-3.1 | An `active` subscription shows a "Pause" button |
| FR-3.2 | An `on_hold` subscription shows an "Unpause" button |
| FR-3.3 | Clicking "Pause" sends `POST /v1/subscription/:handle/on_hold` |
| FR-3.4 | Clicking "Unpause" sends `POST /v1/subscription/:handle/reactivate` |
| FR-3.5 | Apply optimistic UI: update state badge immediately, revert on failure |
| FR-3.6 | Show a loading spinner inside the button during the request |
| FR-3.7 | On success, show a success toast; on failure, show an error toast and revert state |

### FR-4: Notifications

| ID | Requirement |
|----|-------------|
| FR-4.1 | Toasts appear in the top-right corner, stacked vertically |
| FR-4.2 | Three types: `success` (green), `error` (red), `info` (blue) |
| FR-4.3 | Auto-dismiss after 4 000 ms |
| FR-4.4 | Manual dismiss via close button |

## 4. UI States

Every data-driven view supports four states:

| State | Condition | Visual |
|-------|-----------|--------|
| **Loading** | Initial fetch in progress, no data yet | Centered spinner |
| **Loaded** | Data received | Data table |
| **Empty** | Data received, zero items | "No {resource} found" message |
| **Error** | HTTP error caught | Red error box with status-specific message |

For infinite-scroll "load more", a spinner renders inside the sentinel area without replacing existing content.

## 5. Routing

| Path | Component | Behaviour |
|------|-----------|-----------|
| `/` | — | Redirect to `/customers` |
| `/customers` | `CustomerListComponent` | Customer list with search and infinite scroll |
| `/customers/:handle` | `CustomerDetailComponent` | Customer profile, subscriptions, invoices |
| `**` (wildcard) | `NotFoundComponent` | 404 page with link back to `/customers` |

All routes are eagerly loaded (no lazy loading in current implementation).

## 6. Data Models

### Customer

```
handle          string    Unique identifier
email           string    Contact email
first_name      string    Given name
last_name       string    Family name
company         string    Company name
address         string    Street address line 1
address2        string    Street address line 2
city            string    City
postal_code     string    Postal / ZIP code
country         string    ISO country code
phone           string    Phone number
vat             string    VAT number
created         string    ISO 8601 timestamp
subscriptions   number    Count of associated subscriptions
test            boolean   Whether this is a test customer
```

### Subscription

```
handle          string    Unique identifier
customer        string    Parent customer handle
plan            string    Plan handle
state           string    active | cancelled | expired | on_hold
amount          number    Amount in minor units
quantity        number    Quantity
currency        string    ISO currency code
created         string    ISO 8601 timestamp
activated       string    Activation timestamp
renewing        boolean   Auto-renew flag
is_cancelled    boolean   Cancellation flag
cancelled_date  string    Cancellation timestamp
on_hold_date    string    On-hold timestamp
```

### Invoice

```
id              string    Unique identifier (UUID)
handle          string    Human-readable handle
customer        string    Parent customer handle
subscription    string    Parent subscription handle
plan            string    Plan handle
state           string    created | pending | settled | authorized | failed
amount          number    Amount in minor units (divide by 100 for display)
currency        string    ISO currency code
created         string    ISO 8601 timestamp
settled         string    Settlement timestamp
```

### List Response Envelope

All list endpoints return:

```
size            number            Requested page size
count           number            Items in this page
next_page_token string | null     Cursor for next page (null = last page)
content         T[]               Array of items
```

## 7. API Contracts

Base URL: `https://api.frisbii.com/v1`

Authentication: HTTP Basic Auth (`Authorization: Basic base64(apiKey + ':')`)

### Endpoints Used

| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/list/customer` | `size`, `next_page_token`, `handle_contains` | List customers |
| GET | `/customer/:handle` | — | Get single customer |
| GET | `/list/subscription` | `size`, `customer`, `next_page_token` | List subscriptions |
| GET | `/list/invoice` | `size`, `customer`, `next_page_token` | List invoices |
| POST | `/subscription/:handle/on_hold` | — | Pause subscription |
| POST | `/subscription/:handle/reactivate` | — | Unpause subscription |

### Constraints

- Minimum `size` for list queries is **10**
- `handle_contains` performs case-sensitive substring match on the `handle` field
- `next_page_token` is opaque; treat as a string passthrough
- POST actions return the updated resource

### Assumptions

1. Invoice `amount` is in minor currency units (cents / oere) — divide by 100 for display
2. The `search` query parameter exists but does not filter by handle; `handle_contains` is required for substring search
3. `handle_prefix` matches only from the start of the handle string; not suitable for partial input like "55" matching "cust-0055"
4. Subscription pause/unpause returns the full updated Subscription object with the new `state`

## 8. Error Handling

| HTTP Status | User-Facing Message | Recovery |
|-------------|---------------------|----------|
| 400 | "Bad request. Check the API key configuration." | Check environment config |
| 401 | "Authentication failed. Check your API key." | Verify API key |
| 403 | "Access forbidden." | Check account permissions |
| 404 | "Resource not found." / "Customer not found." | Navigate back |
| 429 | "Rate limit exceeded. Please wait and try again." | Wait and retry (manual) |
| 5xx | "Server error. Please try again later." | Retry (manual) |
| Network | "An unexpected error occurred." | Check connectivity |

For subscription actions, errors trigger:
1. Revert of the optimistic UI state change
2. Error toast notification

## 9. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Framework | Angular 21 with standalone components |
| State | Angular Signals for component state |
| Async | RxJS for HTTP and stream composition |
| Styling | Tailwind CSS 4 utility classes |
| Fonts | DM Sans (UI), JetBrains Mono (handles, code) |
| Testing | Karma + Jasmine with Angular TestBed, HttpTestingController |
| Code style | Prettier (single quotes, trailing commas, 100 char width) |
| Bundle | Development and production configurations available (`npm run build`) |
| Browser | Modern evergreen browsers (Chrome, Firefox, Safari, Edge) |
| Accessibility | Semantic HTML, keyboard-navigable links and buttons |
| Performance | Cursor-based pagination (no full dataset loading); debounced search |
