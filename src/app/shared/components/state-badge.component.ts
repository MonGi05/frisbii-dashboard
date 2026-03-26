import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-state-badge',
  templateUrl: './state-badge.component.html',
})
export class StateBadgeComponent {
  state = input.required<string>();
  type = input<'subscription' | 'invoice'>('subscription');

  badgeClasses = computed(() => {
    const s = this.normalizedState();
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      settled: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
      unknown: 'bg-gray-100 text-gray-600',
      created: 'bg-gray-100 text-gray-600',
      on_hold: 'bg-amber-100 text-amber-800',
      pending: 'bg-amber-100 text-amber-800',
      authorized: 'bg-blue-100 text-blue-800',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  });

  // Validates the state against known values for the given type.
  // Returns 'unknown' for unrecognised API states so the badge always renders gracefully.
  normalizedState(): string {
    const s = this.state().toLowerCase();
    const subscriptionStates = ['active', 'cancelled', 'expired', 'on_hold'];
    const invoiceStates = ['created', 'pending', 'settled', 'authorized', 'failed'];
    const knownStates = this.type() === 'invoice' ? invoiceStates : subscriptionStates;
    return knownStates.includes(s) ? s : 'unknown';
  }
}
