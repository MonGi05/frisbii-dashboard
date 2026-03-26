import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Basic Auth header to Frisbii API requests', () => {
    http.get(`${environment.apiBaseUrl}/list/customer`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/list/customer`);
    expect(req.request.headers.has('Authorization')).toBeTrue();

    const expectedAuth = 'Basic ' + btoa(environment.apiKey + ':');
    expect(req.request.headers.get('Authorization')).toBe(expectedAuth);
    req.flush({});
  });

  it('should NOT add auth header to non-Frisbii requests', () => {
    http.get('https://other-api.com/data').subscribe();

    const req = httpMock.expectOne('https://other-api.com/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should propagate 401 errors immediately without retry', () => {
    let errorReceived = false;

    http.get(`${environment.apiBaseUrl}/customer/test`).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
        errorReceived = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/test`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeTrue();
    httpMock.expectNone(`${environment.apiBaseUrl}/customer/test`);
  });

  it('should propagate 403 errors immediately without retry', () => {
    let errorReceived = false;

    http.get(`${environment.apiBaseUrl}/customer/test`).subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
        errorReceived = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/test`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(errorReceived).toBeTrue();
    httpMock.expectNone(`${environment.apiBaseUrl}/customer/test`);
  });

  it('should propagate 404 errors immediately without retry', () => {
    let errorReceived = false;

    http.get(`${environment.apiBaseUrl}/customer/nonexistent`).subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
        errorReceived = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/customer/nonexistent`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(errorReceived).toBeTrue();
    httpMock.expectNone(`${environment.apiBaseUrl}/customer/nonexistent`);
  });
});
