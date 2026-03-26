import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InvoiceService } from './invoice.service';
import { environment } from '../../../environments/environment';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InvoiceService],
    });
    service = TestBed.inject(InvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch invoices for a customer', () => {
    const mockResponse = {
      size: 20,
      count: 1,
      content: [
        {
          id: 'inv-001',
          handle: 'inv-handle-001',
          customer: 'cust-001',
          subscription: 'sub-001',
          plan: 'basic',
          state: 'settled',
          processing: false,
          type: 'subscription_recurring',
          amount: 4900,
          number: 1,
          currency: 'USD',
          due: '2024-02-01T00:00:00Z',
          failed: '',
          settled: '2024-01-15T00:00:00Z',
          cancelled: '',
          authorized: '',
          created: '2024-01-01T00:00:00Z',
          plan_version: 1,
          dunning_plan: '',
        },
      ],
    };

    service.getInvoices('cust-001').subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].state).toBe('settled');
      expect(res.content[0].amount).toBe(4900);
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/invoice?size=10&customer=cust-001`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should get a single invoice', () => {
    service.getInvoice('inv-001').subscribe((res) => {
      expect(res.id).toBe('inv-001');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/invoice/inv-001`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'inv-001', state: 'settled' });
  });

  it('should fetch invoices with pagination token', () => {
    service.getInvoices('cust-001', 10, 'page-token').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/invoice?size=10&customer=cust-001&next_page_token=page-token`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ size: 10, count: 0, content: [] });
  });

  it('should handle 404 error for invoice', () => {
    service.getInvoice('nonexistent').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/invoice/nonexistent`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 401 Unauthorized error on invoice list', () => {
    service.getInvoices('cust-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/invoice?size=10&customer=cust-001`,
    );
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 500 Server error on invoice list', () => {
    service.getInvoices('cust-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/invoice?size=10&customer=cust-001`,
    );
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle 403 Forbidden error on invoice detail', () => {
    service.getInvoice('inv-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/invoice/inv-001`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });
});
