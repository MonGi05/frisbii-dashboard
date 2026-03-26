export type SubscriptionState = 'active' | 'cancelled' | 'expired' | 'on_hold';

export interface Subscription {
  handle: string;
  customer: string;
  plan: string;
  state: string;
  test: boolean;
  amount: number;
  quantity: number;
  currency: string;
  created: string;
  activated: string;
  renewing: boolean;
  expires: string;
  reactivated: string;
  timezone: string;
  plan_version: number;
  amount_incl_vat: boolean;
  start_date: string;
  end_date: string;
  grace_duration: number;
  is_cancelled: boolean;
  cancelled_date: string;
  on_hold_date: string;
}

export interface SubscriptionListResponse {
  size: number;
  count: number;
  next_page_token?: string;
  content: Subscription[];
}
