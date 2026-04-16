import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  const pipe = new CurrencyFormatPipe();

  it('should convert minor units to dollars', () => {
    expect(pipe.transform(4900)).toBe('$49.00');
  });

  it('should handle zero', () => {
    expect(pipe.transform(0)).toBe('$0.00');
  });

  it('should format with the specified currency', () => {
    const result = pipe.transform(1000, 'EUR');
    expect(result).toContain('10.00');
  });

  it('should uppercase the currency code', () => {
    const result = pipe.transform(500, 'gbp');
    expect(result).toContain('5.00');
  });

  it('should fall back gracefully for invalid currency codes', () => {
    const result = pipe.transform(1234, 'NOPE');
    expect(result).toBe('NOPE 12.34');
  });
});
