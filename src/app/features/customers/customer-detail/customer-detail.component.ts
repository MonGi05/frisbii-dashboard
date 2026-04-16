import {
  Component,
  inject,
  signal,
  effect,
  OnInit,
  DestroyRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { CustomerService } from '../../../core/services/customer.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { ToastService } from '../../../core/services/toast.service';
import { Customer } from '../../../core/models/customer.model';
import { Subscription, SubscriptionState } from '../../../core/models/subscription.model';
import { Invoice } from '../../../core/models/invoice.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorDisplayComponent } from '../../../shared/components/error-display.component';
import { StateBadgeComponent } from '../../../shared/components/state-badge.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-customer-detail',
  imports: [
    RouterLink,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    StateBadgeComponent,
    CurrencyFormatPipe,
    DatePipe,
  ],
  templateUrl: './customer-detail.component.html',
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  subsSentinel = viewChild<ElementRef<HTMLDivElement>>('subsSentinel');
  invSentinel = viewChild<ElementRef<HTMLDivElement>>('invSentinel');

  customer = signal<Customer | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  subscriptions = signal<Subscription[]>([]);
  subscriptionsLoading = signal(false);
  subscriptionsLoadingMore = signal(false);
  subscriptionsError = signal<string | null>(null);
  subscriptionsNextToken = signal<string | undefined>(undefined);
  subscriptionsHasMore = signal(false);

  invoices = signal<Invoice[]>([]);
  invoicesLoading = signal(false);
  invoicesLoadingMore = signal(false);
  invoicesError = signal<string | null>(null);
  invoicesNextToken = signal<string | undefined>(undefined);
  invoicesHasMore = signal(false);

  // Per-subscription loading flag so individual action buttons can show spinners
  // without blocking the entire table.
  actionLoading = signal<Record<string, boolean>>({});

  private subsObserver: IntersectionObserver | null = null;
  private invObserver: IntersectionObserver | null = null;

  constructor() {
    // Sentinels live inside @if blocks that depend on async data, so they
    // may be created/destroyed as data loads. These effects re-attach the
    // IntersectionObserver whenever Angular inserts the sentinel into the DOM.
    effect(() => {
      const el = this.subsSentinel()?.nativeElement;
      if (el && this.subsObserver) {
        this.subsObserver.disconnect();
        this.subsObserver.observe(el);
      }
    });

    effect(() => {
      const el = this.invSentinel()?.nativeElement;
      if (el && this.invObserver) {
        this.invObserver.disconnect();
        this.invObserver.observe(el);
      }
    });
  }

  ngOnInit(): void {
    this.setupSubsObserver();
    this.setupInvObserver();

    // switchMap cancels the previous customer fetch if the route :handle changes
    // before it completes (e.g. quick back-forward navigation).
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const handle = params.get('handle')!;
          this.loading.set(true);
          this.error.set(null);
          return this.customerService.getCustomer(handle).pipe(
            catchError((err) => {
              this.error.set(this.extractError(err));
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((c) => {
        if (c) {
          this.customer.set(c);
          this.loadSubscriptions(c.handle);
          this.loadInvoices(c.handle);
        }
        this.loading.set(false);
      });
  }

  // Fall back to handle when the customer has no name fields.
  customerName(c: Customer): string {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
    return name || c.handle;
  }

  // Fall back to handle prefix when first/last name are missing.
  avatarInitials(c: Customer): string {
    if (c.first_name && c.last_name) {
      return (c.first_name[0] + c.last_name[0]).toUpperCase();
    }
    return c.handle.substring(0, 2).toUpperCase();
  }

  fullAddress(c: Customer): string {
    const parts = [c.address, c.address2, c.city, c.postal_code].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  }

  // Optimistic UI: immediately flip state to 'on_hold' for instant feedback,
  // then revert if the API call fails.
  pauseSubscription(sub: Subscription): void {
    this.updateActionLoading(sub.handle, true);
    const previousState = sub.state;
    this.updateSubscriptionState(sub.handle, 'on_hold');

    this.subscriptionService
      .putOnHold(sub.handle)
      .pipe(
        catchError((err) => {
          this.updateSubscriptionState(sub.handle, previousState);
          this.toastService.error('Failed to pause subscription: ' + this.extractError(err));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.updateActionLoading(sub.handle, false);
        if (res) {
          this.updateSubscriptionState(sub.handle, res.state);
          this.toastService.success(`Subscription ${sub.handle} paused successfully`);
        }
      });
  }

  // Same optimistic pattern as pauseSubscription — flip to 'active', revert on error.
  unpauseSubscription(sub: Subscription): void {
    this.updateActionLoading(sub.handle, true);
    const previousState = sub.state;
    this.updateSubscriptionState(sub.handle, 'active');

    this.subscriptionService
      .reactivate(sub.handle)
      .pipe(
        catchError((err) => {
          this.updateSubscriptionState(sub.handle, previousState);
          this.toastService.error('Failed to unpause subscription: ' + this.extractError(err));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.updateActionLoading(sub.handle, false);
        if (res) {
          this.updateSubscriptionState(sub.handle, res.state);
          this.toastService.success(`Subscription ${sub.handle} reactivated successfully`);
        }
      });
  }

  private updateSubscriptionState(handle: string, state: SubscriptionState): void {
    this.subscriptions.update((subs) =>
      subs.map((s) => (s.handle === handle ? { ...s, state } : s)),
    );
  }

  private updateActionLoading(handle: string, loading: boolean): void {
    this.actionLoading.update((prev) => ({ ...prev, [handle]: loading }));
  }

  private loadSubscriptions(customerHandle: string): void {
    this.subscriptionsLoading.set(true);
    this.subscriptionService
      .getSubscriptions(customerHandle)
      .pipe(
        catchError((err) => {
          this.subscriptionsError.set(this.extractError(err));
          this.subscriptionsLoading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.subscriptions.set(res.content);
          this.subscriptionsNextToken.set(res.next_page_token);
          this.subscriptionsHasMore.set(!!res.next_page_token);
        }
        this.subscriptionsLoading.set(false);
      });
  }

  // Guard: skip if already fetching, no more pages, or customer not yet loaded.
  private loadMoreSubscriptions(): void {
    if (this.subscriptionsLoadingMore() || !this.subscriptionsHasMore() || !this.customer()) return;
    this.subscriptionsLoadingMore.set(true);
    this.subscriptionService
      .getSubscriptions(this.customer()!.handle, 10, this.subscriptionsNextToken())
      .pipe(
        catchError(() => {
          this.subscriptionsLoadingMore.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.subscriptions.update((s) => [...s, ...res.content]);
          this.subscriptionsNextToken.set(res.next_page_token);
          this.subscriptionsHasMore.set(!!res.next_page_token);
        }
        this.subscriptionsLoadingMore.set(false);
      });
  }

  private loadInvoices(customerHandle: string): void {
    this.invoicesLoading.set(true);
    this.invoiceService
      .getInvoices(customerHandle)
      .pipe(
        catchError((err) => {
          this.invoicesError.set(this.extractError(err));
          this.invoicesLoading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.invoices.set(res.content);
          this.invoicesNextToken.set(res.next_page_token);
          this.invoicesHasMore.set(!!res.next_page_token);
        }
        this.invoicesLoading.set(false);
      });
  }

  // Guard: skip if already fetching, no more pages, or customer not yet loaded.
  private loadMoreInvoices(): void {
    if (this.invoicesLoadingMore() || !this.invoicesHasMore() || !this.customer()) return;
    this.invoicesLoadingMore.set(true);
    this.invoiceService
      .getInvoices(this.customer()!.handle, 10, this.invoicesNextToken())
      .pipe(
        catchError(() => {
          this.invoicesLoadingMore.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.invoices.update((i) => [...i, ...res.content]);
          this.invoicesNextToken.set(res.next_page_token);
          this.invoicesHasMore.set(!!res.next_page_token);
        }
        this.invoicesLoadingMore.set(false);
      });
  }

  private setupSubsObserver(): void {
    this.subsObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) this.loadMoreSubscriptions();
      },
      { threshold: 0.1 },
    );
    this.destroyRef.onDestroy(() => this.subsObserver?.disconnect());
  }

  private setupInvObserver(): void {
    this.invObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) this.loadMoreInvoices();
      },
      { threshold: 0.1 },
    );
    this.destroyRef.onDestroy(() => this.invObserver?.disconnect());
  }

  private extractError(err: { status?: number; message?: string }): string {
    if (err.status === 400) return 'Bad request. Check the API key configuration.';
    if (err.status === 401) return 'Authentication failed. Check your API key.';
    if (err.status === 403) return 'Access forbidden.';
    if (err.status === 404) return 'Customer not found.';
    if (err.status === 429) return 'Rate limit exceeded. Please wait and try again.';
    if (err.status && err.status >= 500) return 'Server error. Please try again later.';
    return err.message || 'An unexpected error occurred.';
  }
}
