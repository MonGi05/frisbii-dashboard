import { TestBed } from '@angular/core/testing';
import { StateBadgeComponent } from './state-badge.component';

describe('StateBadgeComponent', () => {
  let badge: StateBadgeComponent;

  function createBadge(state: string, type: 'subscription' | 'invoice' = 'subscription'): void {
    const fixture = TestBed.createComponent(StateBadgeComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    badge = fixture.componentInstance;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StateBadgeComponent],
    });
  });

  describe('normalizedState', () => {
    it('should return known subscription states as-is', () => {
      for (const s of ['active', 'cancelled', 'expired', 'on_hold']) {
        createBadge(s);
        expect(badge.normalizedState()).toBe(s);
      }
    });

    it('should return known invoice states when type is invoice', () => {
      for (const s of ['created', 'pending', 'settled', 'authorized', 'failed']) {
        createBadge(s, 'invoice');
        expect(badge.normalizedState()).toBe(s);
      }
    });

    it('should normalize case', () => {
      createBadge('ACTIVE');
      expect(badge.normalizedState()).toBe('active');
    });

    it('should return unknown for unrecognised states', () => {
      createBadge('bogus');
      expect(badge.normalizedState()).toBe('unknown');
    });

    it('should return unknown for invoice state used with subscription type', () => {
      createBadge('settled', 'subscription');
      expect(badge.normalizedState()).toBe('unknown');
    });
  });

  describe('badgeClasses', () => {
    it('should return green classes for active', () => {
      createBadge('active');
      expect(badge.badgeClasses()).toContain('bg-green-100');
    });

    it('should return gray fallback for unknown state', () => {
      createBadge('bogus');
      expect(badge.badgeClasses()).toContain('bg-gray-100');
    });
  });
});
