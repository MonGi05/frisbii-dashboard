import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionService } from './subscription.service';
import { environment } from '../../../environments/environment';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SubscriptionService],
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch subscriptions for a customer', () => {
    const mockResponse = {
      size: 20,
      count: 1,
      content: [
        {
          handle: 'sub-001',
          customer: 'cust-001',
          plan: 'basic-plan',
          state: 'active',
          test: false,
          amount: 9900,
          quantity: 1,
          currency: 'USD',
          created: '2024-01-01T00:00:00Z',
          activated: '2024-01-01T00:00:00Z',
          renewing: true,
          expires: '',
          reactivated: '',
          timezone: 'UTC',
          plan_version: 1,
          amount_incl_vat: false,
          start_date: '2024-01-01T00:00:00Z',
          end_date: '',
          grace_duration: 0,
          is_cancelled: false,
          cancelled_date: '',
          on_hold_date: '',
        },
      ],
    };

    service.getSubscriptions('cust-001').subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].state).toBe('active');
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/subscription?size=10&customer=cust-001`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should put subscription on hold', () => {
    const mockSub = { handle: 'sub-001', state: 'on_hold' };

    service.putOnHold('sub-001').subscribe((res) => {
      expect(res.state).toBe('on_hold');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/sub-001/on_hold`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockSub);
  });

  it('should reactivate a subscription', () => {
    const mockSub = { handle: 'sub-001', state: 'active' };

    service.reactivate('sub-001').subscribe((res) => {
      expect(res.state).toBe('active');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/sub-001/reactivate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockSub);
  });

  it('should get a single subscription', () => {
    service.getSubscription('sub-001').subscribe((res) => {
      expect(res.handle).toBe('sub-001');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/sub-001`);
    expect(req.request.method).toBe('GET');
    req.flush({ handle: 'sub-001', state: 'active' });
  });

  it('should fetch subscriptions with pagination token', () => {
    service.getSubscriptions('cust-001', 10, 'page-token').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/subscription?size=10&customer=cust-001&next_page_token=page-token`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ size: 10, count: 0, content: [] });
  });

  it('should handle 401 Unauthorized error on list', () => {
    service.getSubscriptions('cust-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/subscription?size=10&customer=cust-001`,
    );
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 404 error on put on hold', () => {
    service.putOnHold('nonexistent').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/nonexistent/on_hold`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 500 error on reactivate', () => {
    service.reactivate('sub-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/sub-001/reactivate`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle 403 Forbidden error on subscription detail', () => {
    service.getSubscription('sub-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subscription/sub-001`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });
});
