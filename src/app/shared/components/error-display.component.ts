import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-display',
  templateUrl: './error-display.component.html',
})
export class ErrorDisplayComponent {
  message = input<string>('An unexpected error occurred. Please try again.');
}
