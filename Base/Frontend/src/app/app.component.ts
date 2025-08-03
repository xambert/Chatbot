import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing/landing.component';
import { ChatComponent } from './chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LandingComponent, ChatComponent],
  template: `
    <div class="app-container">
      <!-- Landing Page - Always visible -->
      <app-landing></app-landing>
      
      <!-- Chat Modal Popup -->
      <div *ngIf="showChat" class="chat-modal-overlay" (click)="closeChat()">
        <div class="chat-modal" (click)="$event.stopPropagation()">
          <div class="chat-header">
            <div class="chat-header-content">
              <div class="chat-avatar">
                <span class="material-icons">support_agent</span>
              </div>
              <div class="chat-title">
                <h3>Live Support</h3>
                <p>Vaani AI Support</p>
              </div>
            </div>
            <button class="close-chat-btn" (click)="closeChat()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="chat-content">
            <app-chat></app-chat>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Vaani AI';
  showChat = false;

  ngOnInit() {
    // Listen for chat open events
    window.addEventListener('openChat', () => {
      this.showChat = true;
    });
  }

  closeChat() {
    this.showChat = false;
  }
}
