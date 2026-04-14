import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Subscription, SubscriptionListResponse } from '../models/subscription.model';

/** Reads subscriptions and performs lifecycle actions (pause/reactivate) via the Frisbii API. */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/subscription`;

  getSubscriptions(
    customerHandle: string,
    size: number = 10,
    nextPageToken?: string,
  ): Observable<SubscriptionListResponse> {
    let params = new HttpParams().set('size', size.toString()).set('customer', customerHandle);
    if (nextPageToken) {
      params = params.set('next_page_token', nextPageToken);
    }
    return this.http.get<SubscriptionListResponse>(`${environment.apiBaseUrl}/list/subscription`, {
      params,
    });
  }

  getSubscription(handle: string): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.baseUrl}/${handle}`);
  }

  // The API expects an empty POST body for both lifecycle actions.
  putOnHold(handle: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.baseUrl}/${handle}/on_hold`, {});
  }

  reactivate(handle: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.baseUrl}/${handle}/reactivate`, {});
  }
}
