import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  DestroyRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../../shared/components/error-display.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-customer-list',
  imports: [FormsModule, LoadingSpinnerComponent, ErrorDisplayComponent, DatePipe],
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  scrollSentinel = viewChild<ElementRef<HTMLDivElement>>('scrollSentinel');

  customers = signal<Customer[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');
  nextPageToken = signal<string | undefined>(undefined);
  hasMore = signal(false);

  totalLoaded = computed(() => this.customers().length);

  private searchSubject = new Subject<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    // The sentinel <div> lives inside an @if(hasMore()) block, so Angular
    // destroys and recreates it between pages. This effect re-attaches the
    // IntersectionObserver whenever the sentinel reappears in the DOM.
    effect(() => {
      const el = this.scrollSentinel()?.nativeElement;
      if (el && this.observer) {
        this.observer.disconnect();
        this.observer.observe(el);
      }
    });
  }

  ngOnInit(): void {
    // The URL query param is the single source of truth for search state.
    // All data loading flows through this one subscription — no duplicate fetches.
    this.route.queryParamMap
      .pipe(
        switchMap((params) => {
          const search = params.get('search') ?? '';
          this.searchTerm.set(search);
          this.customers.set([]);
          this.nextPageToken.set(undefined);
          this.hasMore.set(false);
          this.loading.set(true);
          this.error.set(null);
          return this.customerService.getCustomers(10, undefined, search || undefined).pipe(
            catchError((err) => {
              this.error.set(this.extractError(err));
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.customers.set(res.content);
          this.nextPageToken.set(res.next_page_token);
          this.hasMore.set(!!res.next_page_token);
        }
        this.loading.set(false);
      });

    // Debounce keystrokes, then push the value into the URL.
    // The queryParamMap subscription above handles the actual data fetch.
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.updateQueryParam(term);
      });

    this.setupIntersectionObserver();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  // Bypass the debounce pipeline — update the URL immediately.
  // The queryParamMap subscription handles the rest.
  clearSearch(): void {
    this.searchTerm.set('');
    this.updateQueryParam('');
  }

  goToCustomer(handle: string): void {
    this.router.navigate(['/customers', handle]);
  }

  customerName(c: Customer): string {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
    return name || '—';
  }

  // Guard: skip if already fetching or no more pages.
  private loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.customerService
      .getCustomers(10, this.nextPageToken(), this.searchTerm() || undefined)
      .pipe(
        catchError((err) => {
          this.error.set(this.extractError(err));
          this.loadingMore.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.customers.update((c) => [...c, ...res.content]);
          this.nextPageToken.set(res.next_page_token);
          this.hasMore.set(!!res.next_page_token);
        }
        this.loadingMore.set(false);
      });
  }

  // Creates the observer only; the constructor effect() handles attaching it
  // to the sentinel element once Angular renders it.
  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.loadMore();
        }
      },
      { threshold: 0.1 },
    );

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
    });
  }

  // Sync the URL query string to match the given search value.
  // Uses replaceUrl to avoid polluting browser history with every keystroke.
  private updateQueryParam(search: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: search ? { search } : {},
      replaceUrl: true,
    });
  }

  private extractError(err: { status?: number; message?: string }): string {
    if (err.status === 400) return 'Bad request. Check the API key configuration.';
    if (err.status === 401) return 'Authentication failed. Check your API key.';
    if (err.status === 403) return 'Access forbidden.';
    if (err.status === 404) return 'Resource not found.';
    if (err.status === 429) return 'Rate limit exceeded. Please wait and try again.';
    if (err.status && err.status >= 500) return 'Server error. Please try again later.';
    return err.message || 'An unexpected error occurred.';
  }
}
