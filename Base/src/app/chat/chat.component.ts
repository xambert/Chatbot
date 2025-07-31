import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HistoryService, ChatSession, HistoryMessage } from '../services/history.service';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isSQL?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-content">
          <span class="material-icons">chat</span>
          <h2>AI Assistant</h2>
          <div class="tools">
            <button class="tool-btn" (click)="toggleHistory()" [class.active]="showHistory" *ngIf="historyEnabled">
              <span class="material-icons">history</span>
              History
            </button>
            <button class="tool-btn" (click)="createNewSession()" *ngIf="historyEnabled">
              <span class="material-icons">add_circle</span>
              New
            </button>
            <button class="tool-btn" (click)="toggleSQLMode()" [class.active]="sqlMode">
              <span class="material-icons">storage</span>
              SQL
            </button>
            <button class="tool-btn" (click)="clearChat()">
              <span class="material-icons">clear_all</span>
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- History Sidebar -->
      <div class="history-sidebar" *ngIf="showHistory && historyEnabled">
        <div class="history-header">
          <h3>Chat History</h3>
          <button class="close-btn" (click)="toggleHistory()">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <div class="history-search">
          <input type="text" 
                 [(ngModel)]="searchTerm" 
                 (keyup.enter)="searchHistory()"
                 placeholder="Search history..."
                 class="search-input">
          <button class="search-btn" (click)="searchHistory()">
            <span class="material-icons">search</span>
          </button>
        </div>
        
        <div class="history-sessions">
          <div *ngFor="let session of chatSessions" 
               class="session-item"
               [class.active]="session.id === currentSessionId">
            <div class="session-content" (click)="loadSession(session)">
              <div class="session-name">{{ session.session_name }}</div>
              <div class="session-meta">
                <span class="message-count">{{ session.message_count }} messages</span>
                <span class="session-date">{{ formatSessionDate(session.updated_at) }}</span>
              </div>
            </div>
            <button class="delete-session" (click)="deleteSession(session)">
              <span class="material-icons">delete</span>
            </button>
          </div>
          
          <div *ngIf="chatSessions.length === 0" class="no-sessions">
            No chat history found. Start a conversation to create your first session!
          </div>
        </div>
      </div>

      <div class="chat-messages" #messagesContainer (scroll)="onScroll($event)">
        <div *ngFor="let message of messages" 
             class="message" 
             [class.user-message]="message.isUser"
             [class.bot-message]="!message.isUser"
             [class.sql-message]="message.isSQL">
          
          <div class="message-content">
            <div class="message-header">
              <span class="material-icons">
                {{ message.isUser ? 'person' : (message.isSQL ? 'storage' : 'smart_toy') }}
              </span>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-text" [innerHTML]="formatMessage(message.text)"></div>
          </div>
        </div>
        
        <div *ngIf="isLoading" class="message bot-message">
          <div class="message-content">
            <div class="message-header">
              <span class="material-icons">smart_toy</span>
              <span class="timestamp">Now</span>
            </div>
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll to Bottom Button -->
      <button class="scroll-to-bottom" 
              *ngIf="showScrollToBottom" 
              (click)="scrollToBottomManual()"
              title="Scroll to bottom">
        <span class="material-icons">keyboard_arrow_down</span>
      </button>

      <div class="chat-input-container">
        <div class="prompt-suggestions" *ngIf="showPrompts">
          <button *ngFor="let prompt of promptSuggestions" 
                  class="prompt-btn" 
                  (click)="selectPrompt(prompt)">
            {{ prompt }}
          </button>
        </div>
        
        <div class="input-wrapper">
          <button class="tool-icon" (click)="togglePrompts()" [class.active]="showPrompts">
            <span class="material-icons">lightbulb</span>
          </button>
          
          <textarea [(ngModel)]="currentMessage" 
                   (keydown)="onKeyDown($event)"
                   placeholder="Type your message here..."
                   class="message-input"
                   rows="1"
                   #messageInput></textarea>
          
          <button class="send-btn" 
                  (click)="sendMessage()" 
                  [disabled]="!currentMessage.trim() || isLoading">
            <span class="material-icons">send</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: Message[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;
  sqlMode: boolean = false;
  showPrompts: boolean = false;
  showHistory: boolean = false;
  historyEnabled: boolean = true; // Enable by default
  currentSessionId: number | null = null;
  chatSessions: ChatSession[] = [];
  searchTerm: string = '';
  showScrollToBottom: boolean = false;
  
  promptSuggestions: string[] = [
    "Show me all users from the database",
    "What's the total count of records?",
    "Explain how to create a SQL table",
    "Help me write a JOIN query",
    "Show database schema information"
  ];

  constructor(private http: HttpClient, private historyService: HistoryService) {}

  ngOnInit() {
    this.addWelcomeMessage();
    this.loadChatSessions();
    this.checkHistoryEnabled();
    
    // Load sessions from local storage immediately
    this.chatSessions = this.getLocalSessions();
  }

  addWelcomeMessage() {
    const welcomeMessage: Message = {
      id: Date.now(),
      text: "Hello! I'm your AI assistant with SQL database support. I can help you with general questions and SQL queries. Use the SQL button to enable database mode, or click the lightbulb for prompt suggestions.",
      isUser: false,
      timestamp: new Date()
    };
    this.messages.push(welcomeMessage);
  }

  sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) return;

    // Create a new session if none exists
    if (!this.currentSessionId) {
      this.createNewSessionForMessage();
    }

    const userMessage: Message = {
      id: Date.now(),
      text: this.currentMessage,
      isUser: true,
      timestamp: new Date(),
      isSQL: this.sqlMode
    };

    this.messages.push(userMessage);
    this.scrollToBottom(); // Scroll after adding user message
    const messageText = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // Send to backend
    const endpoint = this.sqlMode ? '/api/sql-query' : '/api/chat';
    const payload = { 
      message: messageText, 
      sqlMode: this.sqlMode,
      sessionId: this.currentSessionId 
    };

    this.http.post<any>('http://localhost:3001' + endpoint, payload)
      .subscribe({
        next: (response) => {
          // Update current session ID if returned
          if (response.sessionId && !this.currentSessionId) {
            this.currentSessionId = response.sessionId;
            this.historyService.setCurrentSession(this.currentSessionId);
          }
          
          const botMessage: Message = {
            id: Date.now() + 1,
            text: response.message || response.result || 'No response received',
            isUser: false,
            timestamp: new Date(),
            isSQL: this.sqlMode
          };
          this.messages.push(botMessage);
          this.isLoading = false;
          this.scrollToBottom(); // Explicit scroll after adding bot message
          
          // Save to local storage if no backend session
          this.saveMessageToLocalStorage(userMessage, botMessage);
          this.updateLocalSessionMessageCount();
        },
        error: (error) => {
          console.error('Error:', error);
          const errorMessage: Message = {
            id: Date.now() + 1,
            text: 'Sorry, I encountered an error. Please make sure the backend server is running.',
            isUser: false,
            timestamp: new Date()
          };
          this.messages.push(errorMessage);
          this.isLoading = false;
          this.scrollToBottom(); // Explicit scroll after adding error message
          
          // Save to local storage even on error
          this.saveMessageToLocalStorage(userMessage, errorMessage);
          this.updateLocalSessionMessageCount();
        }
      });
  }

  toggleSQLMode() {
    this.sqlMode = !this.sqlMode;
    const modeMessage: Message = {
      id: Date.now(),
      text: `SQL mode ${this.sqlMode ? 'enabled' : 'disabled'}. ${this.sqlMode ? 'You can now query the database directly.' : 'Switched to general chat mode.'}`,
      isUser: false,
      timestamp: new Date(),
      isSQL: false
    };
    this.messages.push(modeMessage);
  }

  togglePrompts() {
    this.showPrompts = !this.showPrompts;
  }

  selectPrompt(prompt: string) {
    this.currentMessage = prompt;
    this.showPrompts = false;
    this.messageInput.nativeElement.focus();
  }

  clearChat() {
    this.messages = [];
    this.currentSessionId = null;
    this.addWelcomeMessage();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatSessionDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatMessage(text: string): string {
    // Basic formatting for code blocks and SQL
    return text
      .replace(/```sql([\s\S]*?)```/g, '<pre class="sql-code">$1</pre>')
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  scrollToBottom() {
    try {
      // Force immediate scroll
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
      
      // Backup scroll with timeout
      setTimeout(() => {
        if (this.messagesContainer && this.messagesContainer.nativeElement) {
          const element = this.messagesContainer.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      }, 50);
      
      // Final scroll attempt
      setTimeout(() => {
        if (this.messagesContainer && this.messagesContainer.nativeElement) {
          const element = this.messagesContainer.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      }, 200);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  scrollToBottomManual() {
    this.showScrollToBottom = false;
    this.scrollToBottom();
  }

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 10;
    this.showScrollToBottom = !isAtBottom && this.messages.length > 3;
  }

  // History Management Methods
  checkHistoryEnabled() {
    this.historyService.getStats().subscribe({
      next: (response) => {
        this.historyEnabled = response.enabled;
        console.log('History enabled:', this.historyEnabled);
      },
      error: (error) => {
        console.warn('History service not available, using local mode:', error);
        // Keep history enabled for local use even if backend is not responding
        this.historyEnabled = true;
      }
    });
  }

  loadChatSessions() {
    if (!this.historyEnabled) return;
    
    this.historyService.getSessions().subscribe({
      next: (response) => {
        this.chatSessions = response.sessions || [];
      },
      error: (error) => {
        console.warn('Could not load chat sessions from backend:', error);
        // Use local storage as fallback
        this.chatSessions = this.getLocalSessions();
      }
    });
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory && this.chatSessions.length === 0) {
      this.loadChatSessions();
    }
  }

  createNewSession() {
    this.historyService.createSession().subscribe({
      next: (response) => {
        if (response.sessionId) {
          this.currentSessionId = response.sessionId;
          this.historyService.setCurrentSession(this.currentSessionId);
          this.clearChat();
          this.loadChatSessions();
        }
      },
      error: (error) => {
        console.warn('Backend not available, creating local session:', error);
        // Fallback to local session
        const localSession: ChatSession = {
          id: Date.now(),
          user_id: 'anonymous',
          session_name: `Chat ${new Date().toLocaleString()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: 1,
          message_count: 0,
          last_message_at: new Date().toISOString()
        };
        this.saveLocalSession(localSession);
        this.currentSessionId = localSession.id;
        this.clearChat();
      }
    });
  }

  loadSession(session: ChatSession) {
    this.historyService.getSessionHistory(session.id).subscribe({
      next: (response) => {
        this.messages = [];
        
        // Convert history to messages
        response.history.forEach(historyMsg => {
          // Add user message
          this.messages.push({
            id: Date.now() + Math.random(),
            text: historyMsg.user_message,
            isUser: true,
            timestamp: new Date(historyMsg.created_at),
            isSQL: historyMsg.is_sql_mode === 1
          });
          
          // Add bot response if available
          if (historyMsg.bot_response) {
            this.messages.push({
              id: Date.now() + Math.random(),
              text: historyMsg.bot_response,
              isUser: false,
              timestamp: new Date(historyMsg.created_at),
              isSQL: historyMsg.is_sql_mode === 1
            });
          }
        });
        
        // If no messages, add welcome message
        if (this.messages.length === 0) {
          this.addWelcomeMessage();
        }
        
        this.currentSessionId = session.id;
        this.historyService.setCurrentSession(this.currentSessionId);
        this.showHistory = false;
        this.scrollToBottom(); // Scroll after loading session
      },
      error: (error) => {
        console.warn('Backend not available, loading from local storage:', error);
        // Fallback to local storage
        this.loadLocalSession(session);
      }
    });
  }

  createNewSessionForMessage() {
    // Create a local session immediately for the current message
    const localSession: ChatSession = {
      id: Date.now(),
      user_id: 'anonymous',
      session_name: `Chat ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: 1,
      message_count: 0,
      last_message_at: new Date().toISOString()
    };
    this.saveLocalSession(localSession);
    this.currentSessionId = localSession.id;
    console.log('Created new session for message:', localSession.id);
  }

  loadLocalSession(session: ChatSession) {
    try {
      const sessionMessages = this.getLocalSessionMessages(session.id);
      console.log('Raw session messages from localStorage:', sessionMessages);
      this.messages = [...sessionMessages]; // Create a copy of the array
      this.currentSessionId = session.id;
      this.showHistory = false;
      
      // If no messages in session, add welcome message
      if (this.messages.length === 0) {
        this.addWelcomeMessage();
        console.log('No messages found, added welcome message');
      } else {
        console.log('Messages loaded:', this.messages);
      }
      
      console.log(`Loaded ${this.messages.length} messages from local storage for session ${session.id}`);
      this.scrollToBottom(); // Scroll after loading local session
    } catch (error) {
      console.error('Error loading local session:', error);
      this.messages = [];
      this.addWelcomeMessage();
      this.scrollToBottom(); // Scroll after error recovery
    }
  }

  deleteSession(session: ChatSession) {
    if (confirm(`Are you sure you want to delete "${session.session_name}"? This action cannot be undone.`)) {
      this.historyService.deleteSession(session.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadChatSessions();
            
            // If this was the current session, clear it
            if (this.currentSessionId === session.id) {
              this.currentSessionId = null;
              this.historyService.setCurrentSession(null);
              this.clearChat();
            }
          }
        },
        error: (error) => {
          console.error('Error deleting session:', error);
        }
      });
    }
  }

  searchHistory() {
    if (!this.searchTerm.trim()) {
      this.loadChatSessions();
      return;
    }
    
    this.historyService.searchHistory(this.searchTerm).subscribe({
      next: (response) => {
        // For simplicity, we'll just reload sessions after search
        // In a full implementation, you might want to show search results differently
        console.log('Search results:', response.results);
        this.loadChatSessions();
      },
      error: (error) => {
        console.error('Error searching history:', error);
      }
    });
  }

  // Local storage fallback methods
  getLocalSessions(): ChatSession[] {
    try {
      const sessions = localStorage.getItem('chatSessions');
      return sessions ? JSON.parse(sessions) : [];
    } catch (error) {
      console.error('Error reading local sessions:', error);
      return [];
    }
  }

  saveLocalSession(session: ChatSession) {
    try {
      const sessions = this.getLocalSessions();
      sessions.unshift(session);
      // Keep only last 20 sessions
      const trimmedSessions = sessions.slice(0, 20);
      localStorage.setItem('chatSessions', JSON.stringify(trimmedSessions));
      this.chatSessions = trimmedSessions;
    } catch (error) {
      console.error('Error saving local session:', error);
    }
  }

  saveMessageToLocalStorage(userMessage: Message, botMessage: Message) {
    try {
      // Save individual messages for the current session
      if (this.currentSessionId) {
        const sessionMessages = this.getLocalSessionMessages(this.currentSessionId);
        sessionMessages.push(userMessage, botMessage);
        localStorage.setItem(`session_${this.currentSessionId}_messages`, JSON.stringify(sessionMessages));
      }
    } catch (error) {
      console.error('Error saving message to local storage:', error);
    }
  }

  getLocalSessionMessages(sessionId: number): Message[] {
    try {
      const messages = localStorage.getItem(`session_${sessionId}_messages`);
      if (messages) {
        const parsedMessages = JSON.parse(messages);
        // Ensure timestamps are Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error reading local session messages:', error);
      return [];
    }
  }

  updateLocalSessionMessageCount() {
    try {
      if (!this.currentSessionId) return;
      
      const sessions = this.getLocalSessions();
      const sessionIndex = sessions.findIndex(s => s.id === this.currentSessionId);
      
      if (sessionIndex !== -1) {
        const sessionMessages = this.getLocalSessionMessages(this.currentSessionId);
        sessions[sessionIndex].message_count = Math.floor(sessionMessages.length / 2); // Divide by 2 since we store both user and bot messages
        sessions[sessionIndex].updated_at = new Date().toISOString();
        sessions[sessionIndex].last_message_at = new Date().toISOString();
        
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
        this.chatSessions = sessions;
      }
    } catch (error) {
      console.error('Error updating local session message count:', error);
    }
  }
}
