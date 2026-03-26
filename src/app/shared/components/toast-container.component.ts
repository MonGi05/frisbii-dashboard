import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  toastClasses(type: 'success' | 'error' | 'info'): string {
    const map = {
      success: 'bg-green-50 text-green-800 border border-green-200',
      error: 'bg-red-50 text-red-800 border border-red-200',
      info: 'bg-blue-50 text-blue-800 border border-blue-200',
    };
    return map[type];
  }
}
