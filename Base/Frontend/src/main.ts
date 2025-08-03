import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' as const },
  { path: 'chat', loadComponent: () => import('./app/chat/chat.component').then(c => c.ChatComponent) }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule, FormsModule, ReactiveFormsModule)
  ]
}).catch(err => console.error(err));
