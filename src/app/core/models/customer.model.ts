export interface Customer {
  handle: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  address: string;
  address2: string;
  city: string;
  country: string;
  phone: string;
  vat: string;
  postal_code: string;
  created: string;
  subscriptions: number;
  test: boolean;
}

// when `next_page_token` is present, more pages exist.
export interface CustomerListResponse {
  size: number;
  count: number;
  next_page_token?: string;
  content: Customer[];
}
