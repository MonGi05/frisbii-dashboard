import { Routes } from '@angular/router';
import { CustomerListComponent } from './features/customers/customer-list/customer-list.component';
import { CustomerDetailComponent } from './features/customers/customer-detail/customer-detail.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: CustomerListComponent },
  { path: 'customers/:handle', component: CustomerDetailComponent },
  { path: '**', component: NotFoundComponent },
];
