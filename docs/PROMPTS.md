You are the team lead for a native Claude Code Agent Team.

Build a small but production-style Angular dashboard app for managing billing data from the Frisbii REST API.

## Product goal
Create a browser-based subscription management dashboard where an operator can:
- browse customers
- search customers by handle substring
- click into a customer detail page
- see that customer's subscriptions and invoices
- pause an active subscription
- unpause an on-hold subscription
- get success/error toast feedback
- navigate with deep-linkable routes
- see loading, empty, and error states everywhere appropriate

## Exact functional scope

### Customer list page
Create a route at `/customers` that:
- fetches the first page of customers from `GET /v1/list/customer`
- uses page size 10
- displays a table with: handle, full name, email, company, created date
- provides a search input that filters using the `handle_contains` query parameter
- debounces search by 350ms
- cancels stale requests when the user types again
- supports infinite scrolling using the API's `next_page_token`
- clicking a row navigates to `/customers/:handle`
- clearing search resets to the unfiltered first page and re-enables infinite scroll

### Customer detail page
Create a route at `/customers/:handle` that:
- fetches the customer from `GET /v1/customer/:handle`
- displays profile info: avatar initials, full name, handle, email, company, phone, full address, country, created date
- fetches subscriptions from `GET /v1/list/subscription?customer=:handle`
- fetches invoices from `GET /v1/list/invoice?customer=:handle`
- displays subscriptions in a table with: handle, state, plan, created date, action button
- displays invoices in a table with: handle, state, amount formatted with currency, created date
- supports independent infinite scroll for subscriptions and invoices
- shows breadcrumb navigation: `Customers > :handle`

### Subscription actions
For subscriptions:
- if state is `active`, show a `Pause` button
- if state is `on_hold`, show an `Unpause` button
- Pause must call `POST /v1/subscription/:handle/on_hold`
- Unpause must call `POST /v1/subscription/:handle/reactivate`
- use optimistic UI: update badge immediately, revert on failure
- show a loading spinner inside the button while request is in flight
- show success toast on success
- show error toast on failure

### Notifications
Implement toasts:
- top-right stacked layout
- types: success, error, info
- auto-dismiss after 4000ms
- manual dismiss button

### Routes
Use these routes only:
- `/` redirects to `/customers`
- `/customers` customer list page
- `/customers/:handle` customer detail page
- wildcard route to a 404 page with link back to `/customers`

## API contract
Base URL: `https://api.frisbii.com/v1`

Authentication:
- use HTTP Basic Auth
- header format: `Authorization: Basic base64(apiKey + ':')`

Use these endpoints:
- GET `/list/customer` with `size`, `next_page_token`, `handle_contains`
- GET `/customer/:handle`
- GET `/list/subscription` with `size`, `customer`, `next_page_token`
- GET `/list/invoice` with `size`, `customer`, `next_page_token`
- POST `/subscription/:handle/on_hold`
- POST `/subscription/:handle/reactivate`

API assumptions:
- invoice amount is in minor units and should be divided by 100 for display
- use `handle_contains`, not `handle_prefix`
- `next_page_token` is opaque
- POST subscription actions return the updated subscription

## Technical constraints
This architecture is mandatory:
- Angular 21
- standalone components only
- no NgModules
- Angular Signals for component-local state
- RxJS for HTTP and stream composition where needed
- Tailwind CSS 4 for styling
- Karma + Jasmine + Angular TestBed + HttpTestingController for tests
- no NgRx
- no backend proxy
- no SSR
- no i18n
- routes are eagerly loaded
- use a functional Angular HTTP interceptor (`HttpInterceptorFn`)
- direct browser calls to the API

## State management rules
- do not build a global store
- each route component owns its own data
- use `signal()` for mutable state
- use `computed()` for derived state
- use `effect()` where needed for side effects such as reconnecting an IntersectionObserver to a recreated sentinel element

## Infinite scroll rules
- use IntersectionObserver with a sentinel element
- re-observe the sentinel if it is destroyed and recreated by conditional rendering
- do not use manual scroll event math unless absolutely necessary

## Search rules
- use RxJS with this shape: debounceTime(350), distinctUntilChanged(), switchMap(...)
- avoid stale responses overwriting fresh results

## Error handling rules
For primary data loading:
- show inline error UI with a friendly message

For action failures:
- show toast error and revert optimistic UI

Map errors roughly as:
- 400 bad request / config problem
- 401 auth failed
- 403 forbidden
- 404 resource not found
- 429 rate limit exceeded
- 5xx server error
- fallback unexpected error

The auth interceptor includes automatic retry with exponential backoff (1s→2s→4s, max 3 retries) for 429 and 5xx errors. Client errors (401/403/404) propagate immediately.

## Styling / UX requirements
- Tailwind utility classes in templates
- keep most component scss files empty
- allow one small custom animation for toast slide-in
- fonts: DM Sans for UI, JetBrains Mono for handles/code-like text
- sidebar dark
- content background light gray
- cards white with rounded corners and border
- badges:
  - active = green
  - on_hold = amber
  - failed = red
  - authorized = blue
- all data views support loading, loaded, empty, and error states

## Project structure
Use a clean Angular structure like this:

src/
  main.ts
  index.html
  styles.scss
  environments/
    environment.ts
  app/
    app.config.ts
    app.routes.ts
    app.ts
    app.html
    app.scss
    core/
      interceptors/
        auth.interceptor.ts
      models/
        customer.model.ts
        subscription.model.ts
        invoice.model.ts
      services/
        customer.service.ts
        subscription.service.ts
        invoice.service.ts
        toast.service.ts
    shared/
      components/
        sidebar.component.ts/html/scss
        state-badge.component.ts/html/scss
        toast-container.component.ts/html/scss
        loading-spinner.component.ts/html/scss
        error-display.component.ts/html/scss
      pipes/
        currency-format.pipe.ts
    features/
      customers/
        customer-list/
          customer-list.component.ts/html/scss
        customer-detail/
          customer-detail.component.ts/html/scss
      not-found/
        not-found.component.ts/html/scss

## Team structure
Spawn and coordinate these teammates:
- Planner
- API Implementer
- UI Implementer
- Tester
- Reviewer

## Phase plan
Run work in 5 phases:

### Phase 1 Foundation
- scaffold Angular 21 app
- configure Tailwind CSS 4
- configure Karma + Jasmine
- create environment config
- create directory structure
- configure Prettier

### Phase 2 Core layer
- implement models
- implement auth interceptor
- register interceptor
- implement CustomerService
- implement SubscriptionService
- implement InvoiceService
- implement ToastService
- implement CurrencyFormatPipe
- add unit tests for the services

### Phase 3 Shared components
- SidebarComponent
- LoadingSpinnerComponent
- ErrorDisplayComponent
- StateBadgeComponent
- ToastContainerComponent
- App shell

### Phase 4 Feature views
- routes
- customer list page
- customer detail page
- search
- infinite scroll
- breadcrumb
- pause/unpause
- not found page

### Phase 5 Polish and verification
- add data-testid attributes
- run tests
- verify routing
- verify search
- verify infinite scroll
- verify optimistic pause/unpause
- complete README and architecture docs
- final review

## Operating rules for the team
- the Planner breaks down phase tasks with acceptance criteria
- API Implementer owns models, services, interceptor, environment config
- UI Implementer owns components, templates, routing, styling
- Tester owns unit tests and behavior verification
- Reviewer owns consistency checks, lint sanity, and final sign-off
- work phase by phase
- only parallelize tasks that are truly independent
- do not expand scope
- do not change architecture without explicit justification
- after each phase, summarize changed files, what passed, and what remains

## Required output style
Start by:
1. summarizing the app and constraints,
2. spawning the teammate roles,
3. creating the shared task list,
4. assigning Phase 1,
5. then continuing phase by phase until complete.

At the end of each phase, provide:
- changed files
- acceptance criteria status
- blockers or risks
- next phase recommendation


I want to add query-param support for the customer search filter, but I do NOT want to destabilize the current signal/component state.

Please keep the current architecture intact and make the smallest safe change.

Constraints:
- Keep `searchTerm` as the component's UI state.
- Keep the existing debounced `searchSubject` search flow.
- Add `ActivatedRoute` and use the URL query param `search` only as persisted filter state.
- On initial load, if `/customers?search=cust-001` is opened, initialize `searchTerm` from the URL and fetch filtered results immediately.
- When the debounced search value changes, update the URL query param.
- Clearing search should remove the query param.
- Do NOT create a feedback loop between query param updates and `searchSubject`.
- Do NOT put infinite-scroll pagination in the URL.

Implementation preference:
- Minimal refactor.
- If needed, extract a small shared fetch helper so initial load and search load use the same code path.

Please show me the diff before applying and briefly explain why it won't create duplicate requests or state loops.

I want to refactor CustomerDetailComponent to use the same IntersectionObserver pattern as CustomerListComponent.

Current situation:
- customer-detail.component.ts uses subsSentinel and invSentinel with viewChild()
- setupSubsObserver() and setupInvObserver() use requestAnimationFrame polling
- The class implements AfterViewInit and wires the observers in ngAfterViewInit()

Target:
- Remove the requestAnimationFrame polling loops.
- Keep subsObserver and invObserver, and keep the template the same.
- Use constructor effect() calls that watch subsSentinel() and invSentinel() (signal viewChild queries) and attach/disconnect the corresponding observers there, just like scrollSentinel is handled in CustomerListComponent.
- Remove AfterViewInit if it’s no longer needed.
- Do not change any API calls or signals, only the observer wiring.

Please edit src/app/features/customers/customer-detail/customer-detail.component.ts accordingly and show me a diff of your changes before applying them.



Please improve the code comments in this project, but do it carefully and professionally.

Goals:
- Add useful comments only where they increase maintainability.
- Prefer comments that explain WHY, business rules, assumptions, edge cases, lifecycle reasoning, and non-obvious decisions.
- Do NOT add noisy comments that only restate what the code already says.
- Do NOT comment every line or every method mechanically.
- Keep comments concise and consistent with the existing code style.
- Update or remove misleading/outdated comments if you find any.

Focus areas first:
1. Complex Angular lifecycle code, signal/effect logic, and observer wiring.
2. RxJS pipelines where the intent is not immediately obvious.
3. Business logic, mapping/transformation logic, and pagination/infinite-scroll behavior.
4. Public services/utilities/components that would benefit from short doc comments.

Process:
- First inspect the project structure and identify the files that most need comments.
- Then propose a short plan listing the top files to improve.
- After that, edit only the files where comments add real value.
- Show me the diff before applying.

Commenting rules:
- Explain why, not what.
- Mention important invariants/preconditions when relevant.
- Add TODO/FIXME only if genuinely justified.
- Keep wording simple and professional.
- Avoid redundant comments like “increment counter” or “call API”.



I'm working on this Frisbii Angular coding challenge. E2E testing is not a core requirement, so I want a small, high-value Playwright setup only.

Please inspect the repo first, then add a minimal but professional Playwright E2E baseline.

Goals:
- Add Playwright config and package.json scripts.
- Keep the setup simple and maintainable.
- Add only a few tests that validate the challenge's main required flows.
- Show me the diff before applying.

Focus on these challenge-aligned flows:
1. App loads and routing works.
2. Customer list renders and search works.
3. Customer detail opens from the list and shows subscriptions/invoices if the current app supports stable assertions.

Rules:
- Prefer robust locators: getByRole, getByLabel, getByTestId only when needed.
- Add data-testid only for elements that are otherwise hard to target.
- Do not overbuild fixtures/helpers.
- Do not create a large auth setup unless authentication truly blocks the app.
- Use Playwright webServer config so tests can run against the local Angular app.
- Keep tests isolated and avoid brittle selectors or waitForTimeout.

Before editing, give me:
- the files you plan to create/modify,
- the exact first tests you recommend based on the repo,
- any assumptions or risks about auth or unstable API data.

Looks good. Please make two small adjustments before applying:

1. Replace the `not.toHaveCount(0)` row assertions with a clearer assertion like checking the first row is visible.
2. In package.json, use `"e2e": "playwright test"` instead of `"npx playwright test"`.

Everything else can stay the same. Then apply the changes.


I want to extend the Playwright setup so I can run tests without an internet connection.

Currently:
- The Angular app calls the real Frisbii API at https://api.frisbii.com/v1 using a real API key in env files.
- Playwright drives the real app; tests rely on live backend data.

Goal:
- Keep the existing Playwright config and tests as the "live API" profile.
- Add a second Playwright profile that runs against a mocked backend so tests can pass offline or when Frisbii is unavailable.

Please:
1. Inspect the current Playwright config, Angular app, and services.
2. Propose the simplest maintainable mocking approach for this project, e.g.:
   - MSW (Mock Service Worker) in front of the browser, or
   - Playwright route interception that stubs the Frisbii API endpoints used by the tests.
3. Implement the mocking solution with:
   - A separate Playwright project in playwright.config.ts (e.g. name: 'chromium-mocked').
   - A clear way to run it, e.g. package.json script "e2e:mocked".
   - Mocks that cover the endpoints the current tests rely on:
     - customer list for /customers page,
     - the customer detail + subscriptions + invoices for the first customer.
   - Stable mock data so assertions can be deterministic.

Constraints:
- Do NOT change the existing live-API project or tests.
- The mocked profile should use the same tests, only with intercepted/mocked HTTP calls.
- Keep the mocking code small and well-organized (no huge inline JSON blobs if avoidable).
- Add brief comments explaining where to extend the mocks when we add more tests.

Deliverables:
- Updated playwright.config.ts with two projects: live and mocked.
- Any new support files needed for mocks (e.g., a small mock-data.ts or mock setup).
- Updated package.json scripts, e.g.:
  - "e2e": "playwright test"          // live API
  - "e2e:mocked": "playwright test --project=chromium-mocked"
- Show me the full diff before applying.


Please identify which Angular components in this repo have meaningful logic and should get unit tests, and which should be skipped because they are mostly presentational.

Then:
1. list the components to cover and why,
2. show a unified diff for the proposed spec files,
3. wait for my confirmation before applying.

Only add tests for components with real logic such as:
- service interaction,
- search/load-more/pagination,
- loading/error state,
- signals/computed behavior,
- optimistic updates with rollback.

Skip trivial display-only components.



 Full-Project Review: Frisbii Dashboard                                                                                      
                                                                                                                              
  High-priority issues                                                                                                        
                    
  1. API key committed to version control

  - Category: Security
  - Severity: High
  - Files: src/environments/environment.ts
  - Why it matters: environment.ts contains a real API key (priv_c3fdd5b4209f6a0416ed7a5e931e1f0b). While .gitignore lists
  this file, git status shows it as tracked and modified ( M status, i.e. it was committed at some point or is staged). If
  this file was ever committed, the key is in the git history even if later ignored. The environment.example.ts also has the
  key prefix hint, which is fine, but the actual key in a tracked file is a credential leak.
  - Recommendation: Verify the key hasn't been committed with git log --all -- src/environments/environment.ts. If it has,    
  rotate the key immediately. Ensure environment.ts is truly untracked (you may need git rm --cached).

  2. API key exposed in browser network traffic (client-side Basic Auth)

  - Category: Security
  - Severity: High
  - Files: src/app/core/interceptors/auth.interceptor.ts, src/environments/environment.ts
  - Why it matters: The private API key (priv_*) is shipped in the production JavaScript bundle and sent as a Basic Auth      
  header from the browser. Anyone with browser DevTools can extract it. The btoa() encoding is trivially reversible. This is a
   fundamental architectural issue for a "pure client-side app" — the private key is public.
  - Recommendation: This is likely an inherent constraint of the project (coding challenge, no backend). If this were
  production, you'd need a BFF proxy or OAuth flow. For a submission, document this tradeoff explicitly in the README or      
  architecture docs. At minimum, ensure the key used is scoped to read-only + limited actions if the API supports it.

  3. environment.ts points to localhost:3000 — not production-ready

  - Category: Code Quality
  - Severity: Medium
  - Files: src/environments/environment.ts
  - Why it matters: The environment.ts has apiBaseUrl: 'http://localhost:3000/v1' while environment.example.ts has
  https://api.frisbii.com/v1. The Angular build has no fileReplacements in angular.json to swap environments for production   
  vs. development builds. A production build (ng build) will bake in whatever environment.ts currently contains — in this     
  case, localhost.
  - Recommendation: Either add fileReplacements for the production config in angular.json, or at minimum document that the    
  reviewer must update environment.ts before building.

  4. Duplicate extractError method

  - Category: Code Quality
  - Severity: Medium
  - Files: src/app/features/customers/customer-list/customer-list.component.ts:202,
  src/app/features/customers/customer-detail/customer-detail.component.ts:319
  - Why it matters: The exact same extractError method is copy-pasted in both feature components. If error messaging changes  
  or new status codes need handling, both must be updated in sync.
  - Recommendation: Extract to a shared utility function (e.g. core/utils/extract-error.ts) or a base mixin. Small but real   
  DRY violation.

  5. Package manager mismatch between CLAUDE.md and actual config

  - Category: Docs
  - Severity: Medium
  - Files: CLAUDE.md, package.json, angular.json
  - Why it matters: CLAUDE.md says "Package manager is yarn (v1). Use yarn add" and commands reference yarn start, yarn test, 
  etc. But package.json declares "packageManager": "npm@11.9.0" and angular.json has "packageManager": "npm". The Playwright  
  webServer config uses npm start. A reviewer following CLAUDE.md instructions would use yarn while the project is actually   
  configured for npm. This is a docs/config inconsistency that will confuse contributors.
  - Recommendation: Pick one. Either align CLAUDE.md to npm, or change package.json/angular.json to yarn. Given the config    
  files say npm, updating CLAUDE.md is the simpler fix.

  6. Subscription.state typed as string instead of SubscriptionState

  - Category: Code Quality
  - Severity: Medium
  - Files: src/app/core/models/subscription.model.ts:8, src/app/core/models/invoice.model.ts:9
  - Why it matters: SubscriptionState and InvoiceState type aliases are defined but never used — the state field on both
  Subscription and Invoice interfaces is typed as string. This means TypeScript won't catch typos in state comparisons (e.g.  
  sub.state === 'actve'). The template does comparisons like sub.state === 'active' and sub.state === 'on_hold' without type  
  safety.
  - Recommendation: Change state: string to state: SubscriptionState and state: InvoiceState respectively in the interface    
  definitions. This also makes updateSubscriptionState in the detail component type-safe.

  ---
  Medium / low-priority improvements

  7. normalizedState() in StateBadge is a method, not a computed signal

  - Category: Code Quality
  - Severity: Low
  - Files: src/app/shared/components/state-badge.component.ts:32
  - Why it matters: badgeClasses is a computed() that calls this.normalizedState(), but normalizedState is a plain method.    
  Since badgeClasses already tracks the state() signal, this works correctly, but making normalizedState a computed() would be
   more consistent with the project's signal-first pattern.
  - Recommendation: Minor. Convert to normalizedState = computed(...) for consistency.

  8. No lazy-loading for routes

  - Category: Code Quality
  - Severity: Low
  - Files: src/app/app.routes.ts
  - Why it matters: All route components are eagerly imported. For a small app with 3 routes this is fine, but it means the   
  entire app ships in one chunk. The budget is 500kB/1MB which should be easily met.
  - Recommendation: Optional. With only ~15 files of source code, eager loading is acceptable. Mention it in ARCHITECTURE.md  
  if you want to show awareness.

  9. dev server binds to 0.0.0.0

  - Category: Security
  - Severity: Low
  - Files: angular.json, package.json (--host 0.0.0.0)
  - Why it matters: The dev server listens on all interfaces, making it accessible to other machines on the network. For local
   dev this is usually unnecessary and slightly increases attack surface.
  - Recommendation: Change to localhost unless there's a specific reason (e.g., testing from a mobile device on the same      
  network). Not a blocker.

  10. Auth interceptor retry tests are incomplete

  - Category: Testing
  - Severity: Low
  - Files: src/app/core/interceptors/auth.interceptor.spec.ts
  - Why it matters: The spec tests that 401/403/404 are not retried, which is great. But there are no tests verifying that 429
   or 5xx are retried with exponential backoff. The retry logic is the most complex part of the interceptor and is untested.  
  - Recommendation: Add at least one test that flushes a 429/500, then verifies a retry request is made after the delay.      

  11. customerName() called in template for every row (not memoized)

  - Category: Code Quality
  - Severity: Low
  - Files: src/app/features/customers/customer-list/customer-list.component.html:108
  - Why it matters: customerName(customer) is a method call in an @for loop. Angular will re-evaluate it on every change      
  detection cycle. For the small row counts here it's negligible, but it's a pattern that doesn't scale.
  - Recommendation: Fine for this project's scope. A pipe would be more idiomatic if you want to optimize.

  12. Toast nextId could overflow after very long sessions

  - Category: Code Quality
  - Severity: Low
  - Files: src/app/core/services/toast.service.ts:12
  - Why it matters: nextId is an ever-incrementing number. JavaScript's Number.MAX_SAFE_INTEGER is ~9 quadrillion, so this is 
  purely theoretical and not a real concern.
  - Recommendation: Not actionable. Mentioning for completeness only.

  ---
  False positives / acceptable tradeoffs

  Client-side API key in a pure SPA

  As noted in the high-priority section, the private key ships to the browser. For a coding challenge with no backend, this is
   the expected architecture. The interceptor correctly scopes the auth header to only apiBaseUrl requests (line 11),
  preventing credential leakage to third-party URLs. The startsWith check is the right approach.

  No CSRF protection

  Not needed. The app makes API calls to a third-party REST API, not to a same-origin backend with cookie-based sessions. CSRF
   is not a concern here.

  No XSS vulnerabilities

  Angular's default template binding ({{ }}) auto-escapes HTML. There are no uses of innerHTML, bypassSecurityTrust*, or      
  DomSanitizer anywhere in the codebase. The state-badge.component.html line {{ state().toUpperCase().replace('_', ' ') }} is 
  safe — Angular interpolation escapes the output. No XSS risk.

  No SQL injection / command injection

  The app has no backend, no database, and no shell execution. URL parameters are constructed via Angular's HttpParams which  
  handles encoding correctly. Not a concern.

  HttpParams.set('size', size.toString())

  This is safe. HttpParams encodes values properly. No URL injection risk.

  Optimistic UI with revert

  The pause/unpause pattern in customer-detail.component.ts (lines 150-197) is well-implemented: it saves previous state,     
  flips optimistically, reverts on error, and shows toast feedback. The actionLoading per-subscription flag prevents
  double-clicks. This is solid.

  No component tests (by design)

  CLAUDE.md explicitly states tests are only written for services and interceptors. The schematics in angular.json skip test  
  generation. This is a documented decision, not an oversight.

  Playwright mock setup architecture

  The e2e/mocks/mock-api.setup.ts approach of context-level route interception per project name is clean. The fallback 500 for
   unhandled routes (line 57) makes unintended gaps visible. No security exposure in the test setup.

  ---
  Final verdict

  Is the project submission-ready?

  Nearly. The code quality is well above average for a coding challenge. Architecture is clean, signals are used correctly,   
  the interceptor is well-designed, tests are thorough for what they cover, and the component structure follows best
  practices. There are no bugs I can identify in the runtime code.

  Top 3 fixes before submission

  1. Verify the API key hasn't leaked into git history and rotate if it has. This is the only genuinely urgent item.
  2. Fix the package manager discrepancy (CLAUDE.md says yarn, everything else says npm). A reviewer will notice this
  immediately.
  3. Use the defined type aliases (SubscriptionState, InvoiceState) on the interface state fields. Small change, demonstrates 
  type discipline.

  What is already especially good

  - Interceptor design — scoping auth to apiBaseUrl only, non-retryable vs. retryable error classification, exponential       
  backoff. This is well-thought-out.
  - Optimistic UI — the pause/unpause flow with rollback is clean and correctly implemented, with per-row loading states.     
  - Signal usage — consistent use of signal(), computed(), viewChild(), and effect() for DOM lifecycle management
  (IntersectionObserver reattachment). This is modern Angular done right.
  - Test quality — service specs are thorough with good coverage of error paths and edge cases (pagination tokens, search     
  params, different HTTP error codes). httpMock.verify() in afterEach is correct practice.
  - Clean separation of concerns — the three-layer architecture is followed strictly with no cross-layer violations. Shared   