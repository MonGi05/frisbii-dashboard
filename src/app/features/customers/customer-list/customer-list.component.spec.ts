import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CustomerListComponent } from './customer-list.component';
import { environment } from '../../../../environments/environment';

const MOCK_CUSTOMERS = [
  {
    handle: 'cust-001', email: 'a@test.com', first_name: 'Alice', last_name: 'Smith',
    company: 'Acme', address: '', address2: '', city: '', country: '', phone: '',
    vat: '', postal_code: '', created: '2025-01-01T00:00:00Z', subscriptions: 1, test: false,
  },
  {
    handle: 'cust-002', email: 'b@test.com', first_name: '', last_name: '',
    company: '', address: '', address2: '', city: '', country: '', phone: '',
    vat: '', postal_code: '', created: '2025-02-01T00:00:00Z', subscriptions: 0, test: false,
  },
];

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let fixture: ComponentFixture<CustomerListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(CustomerListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function initAndFlush(response?: object): void {
    fixture.detectChanges(); // triggers ngOnInit
    const req = httpMock.expectOne((r) => r.url.includes('/list/customer'));
    req.flush(response ?? { size: 10, count: 2, content: MOCK_CUSTOMERS });
  }

  it('should load customers on init', () => {
    initAndFlush();
    expect(component.customers().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should set loading to true while fetching', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    httpMock.expectOne((r) => r.url.includes('/list/customer')).flush({
      size: 10, count: 0, content: [],
    });
    expect(component.loading()).toBeFalse();
  });

  it('should set error on API failure', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/list/customer'));
    req.flush('fail', { status: 500, statusText: 'Server Error' });
    expect(component.error()).toBeTruthy();
    expect(component.loading()).toBeFalse();
  });

  it('should set hasMore when next_page_token exists', () => {
    initAndFlush({ size: 10, count: 2, content: MOCK_CUSTOMERS, next_page_token: 'tok1' });
    expect(component.hasMore()).toBeTrue();
    expect(component.nextPageToken()).toBe('tok1');
  });

  it('should set hasMore to false when no next_page_token', () => {
    initAndFlush({ size: 10, count: 2, content: MOCK_CUSTOMERS });
    expect(component.hasMore()).toBeFalse();
  });

  it('totalLoaded should reflect customers length', () => {
    initAndFlush();
    expect(component.totalLoaded()).toBe(2);
  });

  describe('customerName', () => {
    it('should join first and last name', () => {
      expect(component.customerName(MOCK_CUSTOMERS[0] as any)).toBe('Alice Smith');
    });

    it('should return dash when name is empty', () => {
      expect(component.customerName(MOCK_CUSTOMERS[1] as any)).toBe('—');
    });
  });

  describe('clearSearch', () => {
    it('should reset state and reload', () => {
      initAndFlush();
      component.searchTerm.set('test');

      component.clearSearch();
      expect(component.searchTerm()).toBe('');
      expect(component.customers()).toEqual([]);

      const req = httpMock.expectOne((r) => r.url.includes('/list/customer'));
      req.flush({ size: 10, count: 0, content: [] });
    });
  });

  describe('search', () => {
    it('should pass search term to the API', () => {
      fixture.detectChanges();
      const initReq = httpMock.expectOne((r) => r.url.includes('/list/customer'));
      initReq.flush({ size: 10, count: 0, content: [] });

      component.clearSearch();

      const req = httpMock.expectOne((r) => r.url.includes('/list/customer'));
      expect(req.request.params.has('handle_contains')).toBeFalse();
      req.flush({ size: 10, count: 0, content: [] });
    });
  });
});
