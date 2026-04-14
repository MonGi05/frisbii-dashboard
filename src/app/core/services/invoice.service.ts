import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invoice, InvoiceListResponse } from '../models/invoice.model';

/** Reads individual invoices and paginated invoice lists from the Frisbii API. */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/invoice`;

  getInvoices(
    customerHandle: string,
    size: number = 10,
    nextPageToken?: string,
  ): Observable<InvoiceListResponse> {
    let params = new HttpParams().set('size', size.toString()).set('customer', customerHandle);
    if (nextPageToken) {
      params = params.set('next_page_token', nextPageToken);
    }
    return this.http.get<InvoiceListResponse>(`${environment.apiBaseUrl}/list/invoice`, { params });
  }

  getInvoice(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}/${id}`);
  }
}
