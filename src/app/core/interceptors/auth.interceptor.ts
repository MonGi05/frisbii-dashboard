import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, timer } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiBaseUrl)) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: 'Basic ' + btoa(environment.apiKey + ':'),
      },
    });
    return next(authReq).pipe(
      retry({
        count: MAX_RETRIES,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Only retry transient failures (rate-limit 429 and server 5xx).
          // Client errors (401, 403, 404) are non-retryable — propagate immediately.
          if (error.status === 429 || error.status >= 500) {
            // Exponential backoff: 1s → 2s → 4s
            const delayMs = INITIAL_DELAY_MS * Math.pow(2, retryCount - 1);
            return timer(delayMs);
          }
          return throwError(() => error);
        },
      }),
    );
  }
  return next(req);
};
