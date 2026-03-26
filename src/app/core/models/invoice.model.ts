export type InvoiceState = 'created' | 'pending' | 'settled' | 'authorized' | 'failed';

export interface Invoice {
  id: string;
  handle: string;
  customer: string;
  subscription: string;
  plan: string;
  state: string;
  processing: boolean;
  type: string;
  amount: number;
  number: number;
  currency: string;
  due: string;
  failed: string;
  settled: string;
  cancelled: string;
  authorized: string;
  created: string;
  plan_version: number;
  dunning_plan: string;
}

export interface InvoiceListResponse {
  size: number;
  count: number;
  next_page_token?: string;
  content: Invoice[];
}
