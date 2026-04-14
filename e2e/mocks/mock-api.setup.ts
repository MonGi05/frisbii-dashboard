import { BrowserContext } from '@playwright/test';
import { CUSTOMERS, SUBSCRIPTIONS, INVOICES } from './mock-data';

const API = 'https://api.frisbii.com/v1';

/**
 * Intercepts all Frisbii API calls at the browser-context level and returns
 * fixture data. This covers every page/tab opened within the context.
 *
 * To add a new endpoint: add a branch to the route handler below and
 * extend mock-data.ts with the corresponding fixture.
 */
export async function mockFrisbiiApi(context: BrowserContext): Promise<void> {
  await context.route(`${API}/**`, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/v1', '');
    const params = url.searchParams;

    // Customer list — with optional search filter
    if (path === '/list/customer') {
      const search = params.get('handle_contains') ?? '';
      const filtered = search
        ? CUSTOMERS.filter((c) => c.handle.includes(search))
        : CUSTOMERS;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ size: 10, count: filtered.length, content: filtered }),
      });
    }

    // Single customer by handle
    const customerMatch = path.match(/^\/customer\/(.+)$/);
    if (customerMatch) {
      const customer = CUSTOMERS.find((c) => c.handle === customerMatch[1]);
      if (customer) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(customer),
        });
      }
      return route.fulfill({ status: 404, body: 'Not found' });
    }

    // Subscription list for a customer
    if (path === '/list/subscription') {
      const customerHandle = params.get('customer');
      const subs = SUBSCRIPTIONS.filter((s) => s.customer === customerHandle);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ size: 10, count: subs.length, content: subs }),
      });
    }

    // Invoice list for a customer
    if (path === '/list/invoice') {
      const customerHandle = params.get('customer');
      const invs = INVOICES.filter((i) => i.customer === customerHandle);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ size: 10, count: invs.length, content: invs }),
      });
    }

    // Fallback — let unhandled API calls fail visibly
    return route.fulfill({ status: 500, body: 'Unhandled mock route: ' + path });
  });
}
