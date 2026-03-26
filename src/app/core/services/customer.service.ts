import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Customer, CustomerListResponse } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/customer`;

  getCustomers(
    size: number = 10,
    nextPageToken?: string,
    search?: string,
  ): Observable<CustomerListResponse> {
    let params = new HttpParams().set('size', size.toString());
    if (nextPageToken) {
      params = params.set('next_page_token', nextPageToken);
    }
    if (search) {
      params = params.set('handle_contains', search);
    }
    
    return this.http.get<CustomerListResponse>(`${environment.apiBaseUrl}/list/customer`, {
      params,
    });
  }

  getCustomer(handle: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${handle}`);
  }
}
