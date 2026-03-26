import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
})
export class CurrencyFormatPipe implements PipeTransform {
  // Frisbii returns amounts in minor units (cents). Divide by 100 to get the display value.
  transform(amount: number, currency: string = 'USD'): string {
    const value = amount / 100;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(value);
    } catch {
      return `${currency.toUpperCase()} ${value.toFixed(2)}`;
    }
  }
}
