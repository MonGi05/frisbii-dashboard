import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CustomerDetailComponent } from './customer-detail.component';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { Subscription } from '../../../core/models/subscription.model';

const MOCK_CUSTOMER = {
  handle: 'cust-001', email: 'a@test.com', first_name: 'Alice', last_name: 'Smith',
  company: 'Acme', address: '123 Main', address2: 'Apt 4', city: 'Springfield',
  country: 'US', phone: '+1-555-0100', vat: '', postal_code: '62704',
  created: '2025-01-01T00:00:00Z', subscriptions: 1, test: false,
};

const MOCK_SUB: Subscription = {
  handle: 'sub-001', customer: 'cust-001', plan: 'basic', state: 'active', test: false,
  amount: 4900, quantity: 1, currency: 'USD', created: '2025-01-01T00:00:00Z',
  activated: '2025-01-01T00:00:00Z', renewing: true, expires: '', reactivated: '',
  timezone: 'UTC', plan_version: 1, amount_incl_vat: false, start_date: '2025-01-01',
  end_date: '', grace_duration: 0, is_cancelled: false, cancelled_date: '', on_hold_date: '',
};

describe('CustomerDetailComponent', () => {
  let component: CustomerDetailComponent;
  let fixture: ComponentFixture<CustomerDetailComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;
  let paramMapSubject: BehaviorSubject<any>;

  beforeEach(() => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ handle: 'cust-001' }));

    TestBed.configureTestingModule({
      imports: [CustomerDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMapSubject.asObservable() },
        },
      ],
    });
    fixture = TestBed.createComponent(CustomerDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Trigger ngOnInit and flush the 3 initial API calls. */
  function initAndFlush(opts?: { subsContent?: object[]; invContent?: object[] }): void {
    fixture.detectChanges();

    // 1) Customer fetch
    const custReq = httpMock.expectOne((r) => r.url.includes('/customer/cust-001'));
    custReq.flush(MOCK_CUSTOMER);

    // 2) Subscriptions fetch
    const subsReq = httpMock.expectOne((r) => r.url.includes('/list/subscription'));
    subsReq.flush({
      size: 10, count: (opts?.subsContent ?? [MOCK_SUB]).length,
      content: opts?.subsContent ?? [MOCK_SUB],
    });

    // 3) Invoices fetch
    const invReq = httpMock.expectOne((r) => r.url.includes('/list/invoice'));
    invReq.flush({
      size: 10, count: (opts?.invContent ?? []).length,
      content: opts?.invContent ?? [],
    });
  }

  it('should load customer, subscriptions, and invoices on init', () => {
    initAndFlush();
    expect(component.customer()?.handle).toBe('cust-001');
    expect(component.subscriptions().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('should set error on customer fetch failure', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/customer/cust-001'));
    req.flush('fail', { status: 404, statusText: 'Not Found' });
    expect(component.error()).toBe('Customer not found.');
    expect(component.loading()).toBeFalse();
  });

  it('should set subscriptionsError on subscription fetch failure', () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/customer/cust-001')).flush(MOCK_CUSTOMER);
    httpMock.expectOne((r) => r.url.includes('/list/subscription'))
      .flush('fail', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((r) => r.url.includes('/list/invoice'))
      .flush({ size: 10, count: 0, content: [] });
    expect(component.subscriptionsError()).toBeTruthy();
  });

  describe('helper methods', () => {
    it('customerName should join first and last', () => {
      expect(component.customerName(MOCK_CUSTOMER as any)).toBe('Alice Smith');
    });

    it('customerName should fall back to handle', () => {
      const noName = { ...MOCK_CUSTOMER, first_name: '', last_name: '' };
      expect(component.customerName(noName as any)).toBe('cust-001');
    });

    it('avatarInitials should use first letters of name', () => {
      expect(component.avatarInitials(MOCK_CUSTOMER as any)).toBe('AS');
    });

    it('avatarInitials should fall back to handle prefix', () => {
      const noName = { ...MOCK_CUSTOMER, first_name: '', last_name: '' };
      expect(component.avatarInitials(noName as any)).toBe('CU');
    });

    it('fullAddress should join non-empty parts', () => {
      expect(component.fullAddress(MOCK_CUSTOMER as any)).toBe('123 Main, Apt 4, Springfield, 62704');
    });

    it('fullAddress should return dash when all empty', () => {
      const empty = { ...MOCK_CUSTOMER, address: '', address2: '', city: '', postal_code: '' };
      expect(component.fullAddress(empty as any)).toBe('—');
    });
  });

  describe('pauseSubscription (optimistic UI)', () => {
    it('should optimistically set state to on_hold, then confirm on success', () => {
      initAndFlush();
      const sub = component.subscriptions()[0];

      component.pauseSubscription(sub);

      // Optimistic update happened immediately
      expect(component.subscriptions()[0].state).toBe('on_hold');
      expect(component.actionLoading()['sub-001']).toBeTrue();

      // API responds with success
      const req = httpMock.expectOne((r) => r.url.includes('/subscription/sub-001/on_hold'));
      req.flush({ ...MOCK_SUB, state: 'on_hold' });

      expect(component.subscriptions()[0].state).toBe('on_hold');
      expect(component.actionLoading()['sub-001']).toBeFalse();
    });

    it('should revert state on API failure and show error toast', () => {
      initAndFlush();
      const sub = component.subscriptions()[0];
      spyOn(toastService, 'error');

      component.pauseSubscription(sub);
      expect(component.subscriptions()[0].state).toBe('on_hold');

      const req = httpMock.expectOne((r) => r.url.includes('/subscription/sub-001/on_hold'));
      req.flush('fail', { status: 500, statusText: 'Server Error' });

      // State reverted to original
      expect(component.subscriptions()[0].state).toBe('active');
      expect(toastService.error).toHaveBeenCalled();
    });
  });

  describe('unpauseSubscription (optimistic UI)', () => {
    it('should optimistically set state to active, then confirm on success', () => {
      const onHoldSub = { ...MOCK_SUB, state: 'on_hold' as const };
      initAndFlush({ subsContent: [onHoldSub] });
      const sub = component.subscriptions()[0];

      component.unpauseSubscription(sub);
      expect(component.subscriptions()[0].state).toBe('active');

      const req = httpMock.expectOne((r) => r.url.includes('/subscription/sub-001/reactivate'));
      req.flush({ ...MOCK_SUB, state: 'active' });

      expect(component.subscriptions()[0].state).toBe('active');
      expect(component.actionLoading()['sub-001']).toBeFalse();
    });

    it('should revert state on API failure and show error toast', () => {
      const onHoldSub = { ...MOCK_SUB, state: 'on_hold' as const };
      initAndFlush({ subsContent: [onHoldSub] });
      const sub = component.subscriptions()[0];
      spyOn(toastService, 'error');

      component.unpauseSubscription(sub);
      expect(component.subscriptions()[0].state).toBe('active');

      const req = httpMock.expectOne((r) => r.url.includes('/subscription/sub-001/reactivate'));
      req.flush('fail', { status: 500, statusText: 'Server Error' });

      expect(component.subscriptions()[0].state).toBe('on_hold');
      expect(toastService.error).toHaveBeenCalled();
    });
  });
});
