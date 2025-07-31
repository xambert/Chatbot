import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="landing-container">
      <div class="hero-section">
        <h1 class="app-title">Vaani AI</h1>
        <p class="app-subtitle">Your intelligent conversation partner</p>
      </div>
      
      <!-- Chat Button - positioned at bottom right -->
      <div class="chat-launcher" 
           (click)="openChat()" 
           data-testid="launcher" 
           aria-label="Chat">
        <div class="chat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  openChat() {
    // Emit event to parent to show chat
    window.dispatchEvent(new CustomEvent('openChat'));
  }
}
