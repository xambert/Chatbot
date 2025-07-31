import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ChatSession {
  id: number;
  user_id: string;
  session_name: string;
  created_at: string;
  updated_at: string;
  is_active: number;
  message_count: number;
  last_message_at: string;
}

export interface HistoryMessage {
  id: number;
  session_id: number;
  message_id: string;
  user_message: string;
  bot_response: string;
  is_sql_mode: number;
  created_at: string;
}

export interface HistoryStats {
  total_sessions: number;
  total_messages: number;
  last_activity: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private baseUrl = 'http://localhost:3001/api/history';
  private currentSessionSubject = new BehaviorSubject<number | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get current session ID
  getCurrentSessionId(): number | null {
    return this.currentSessionSubject.value;
  }

  // Set current session ID
  setCurrentSession(sessionId: number | null) {
    this.currentSessionSubject.next(sessionId);
  }

  // Get all chat sessions
  getSessions(userId: string = 'anonymous'): Observable<{sessions: ChatSession[], enabled: boolean}> {
    return this.http.get<{sessions: ChatSession[], enabled: boolean}>(`${this.baseUrl}/sessions?userId=${userId}`);
  }

  // Get chat history for a specific session
  getSessionHistory(sessionId: number): Observable<{history: HistoryMessage[], enabled: boolean}> {
    return this.http.get<{history: HistoryMessage[], enabled: boolean}>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  // Create a new chat session
  createSession(userId: string = 'anonymous', sessionName?: string): Observable<{sessionId: number, enabled: boolean}> {
    return this.http.post<{sessionId: number, enabled: boolean}>(`${this.baseUrl}/sessions`, {
      userId,
      sessionName
    });
  }

  // Delete a chat session
  deleteSession(sessionId: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  // Search chat history
  searchHistory(searchTerm: string, userId: string = 'anonymous'): Observable<{results: HistoryMessage[], enabled: boolean}> {
    return this.http.get<{results: HistoryMessage[], enabled: boolean}>(`${this.baseUrl}/search?q=${encodeURIComponent(searchTerm)}&userId=${userId}`);
  }

  // Get history statistics
  getStats(userId: string = 'anonymous'): Observable<{stats: HistoryStats, enabled: boolean}> {
    return this.http.get<{stats: HistoryStats, enabled: boolean}>(`${this.baseUrl}/stats?userId=${userId}`);
  }
}
