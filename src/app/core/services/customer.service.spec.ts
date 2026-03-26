import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CustomerService } from './customer.service';
import { environment } from '../../../environments/environment';

describe('CustomerService', () => {
  let service: CustomerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CustomerService],
    });
    service = TestBed.inject(CustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch customer list with default size', () => {
    const mockResponse = {
      size: 20,
      count: 2,
      content: [
        {
          handle: 'cust-001',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          company: '',
          address: '',
          address2: '',
          city: '',
          country: '',
          phone: '',
          vat: '',
          postal_code: '',
          created: '2024-01-01T00:00:00Z',
          subscriptions: 1,
          test: false,
        },
        {
          handle: 'cust-002',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          company: 'Acme',
          address: '',
          address2: '',
          city: '',
          country: '',
          phone: '',
          vat: '',
          postal_code: '',
          created: '2024-02-01T00:00:00Z',
          subscriptions: 0,
          test: false,
        },
      ],
    };

    service.getCustomers().subscribe((res) => {
      expect(res.content.length).toBe(2);
      expect(res.content[0].handle).toBe('cust-001');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/list/customer?size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch customer list with search parameter', () => {
    service.getCustomers(10, undefined, 'john').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/customer?size=10&handle_contains=john`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ size: 10, count: 0, content: [] });
  });

  it('should fetch customer list with next_page_token', () => {
    service.getCustomers(10, 'token123').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/list/customer?size=10&next_page_token=token123`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ size: 20, count: 0, content: [] });
  });

  it('should get a single customer by handle', () => {
    const mockCustomer = {
      handle: 'cust-001',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: '',
      address: '',
      address2: '',
      city: '',
      country: '',
      phone: '',
      vat: '',
      postal_code: '',
      created: '2024-01-01T00:00:00Z',
      subscriptions: 1,
      test: false,
    };

    service.getCustomer('cust-001').subscribe((customer) => {
      expect(customer.handle).toBe('cust-001');
      expect(customer.email).toBe('test@example.com');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/cust-001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCustomer);
  });

  it('should handle 401 Unauthorized error', () => {
    service.getCustomers().subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/list/customer?size=10`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 403 Forbidden error', () => {
    service.getCustomer('cust-001').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/cust-001`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('should handle 404 Not Found error for single customer', () => {
    service.getCustomer('nonexistent').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/nonexistent`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 500 Server error', () => {
    service.getCustomers().subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/list/customer?size=10`);
    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});
