import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { AIServices, AIProvider } from '../chat/chat.model';

export interface ChatStreamMessage {
  type: string;
  response?: unknown;
  completionText?: string;
  couchDBResponse?: any;
  metadata?: Record<string, any>;
  error?: string;
}

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  readonly dbName = 'chat_history';

  private baseUrl = environment.chatAddress;
  private socket: WebSocket;

  private chatStreamSubject: Subject<ChatStreamMessage> = new Subject<ChatStreamMessage>();
  private errorSubject: Subject<string> = new Subject<string>();
  private newChatAdded: Subject<void> = new Subject<void>();
  private newChatSelected: Subject<void> = new Subject<void>();
  private toggleAIService = new Subject<string>();
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);
  private aiProvidersSubject = new BehaviorSubject<Array<AIProvider>>([]);
  private currentChatAIProvider = new BehaviorSubject<AIProvider>(undefined);

  newChatAdded$ = this.newChatAdded.asObservable();
  newChatSelected$ = this.newChatSelected.asObservable();
  toggleAIService$ = this.toggleAIService.asObservable();
  aiProviders$ = this.aiProvidersSubject.asObservable();
  selectedConversationId$: Observable<object | null> = this.selectedConversationIdSubject.asObservable();
  currentChatAIProvider$: Observable<AIProvider> = this.currentChatAIProvider.asObservable();

  constructor(
    private httpClient: HttpClient,
    private couchService: CouchService
  ) {
    this.fetchAIProviders();
  }

  initializeWebSocket() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = new WebSocket('ws' + this.baseUrl.slice(4));
      this.socket.onerror = (error) => {
        this.errorSubject.next('WebSocket connection error');
      };
      this.socket.addEventListener('message', (event) => {
        try {
          const message: ChatStreamMessage = JSON.parse(event.data);
          if (message.type === 'error') {
            this.errorSubject.next(message.error || 'Unknown error');
          } else {
            this.chatStreamSubject.next(message);
          }
        } catch (error) {
          this.errorSubject.next('Invalid message format');
        }
      });
    }
  }

  private fetchAIProviders() {
    this.httpClient
      .get<AIServices>(`${this.baseUrl}/checkproviders`)
      .pipe(
        catchError((err) => {
          console.error(err);
          return of({ openai: false, perplexity: false, deepseek: false, gemini: false });
        }),
        map((services: AIServices) => {
          if (services) {
            return Object.entries(services)
              .filter(([ _, model ]) => model === true)
              .map(([ key ]) => ({ name: key, model: key }));
          } else {
            return [];
          }
        })
      )
      .subscribe((providers) => {
        this.aiProvidersSubject.next(providers);
      });
  }

  listAIProviders(): Observable<Array<AIProvider>> {
    return this.aiProviders$;
  }

  getPrompt(data: Object, save: boolean): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      data,
      save,
    });
  }

  // Subscribe to stream updates
  getChatStream(): Observable<ChatStreamMessage> {
    return this.chatStreamSubject.asObservable();
  }

  getErrorStream(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  // Method to send user input via WebSocket
  sendUserInput(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // Function to close ws connection
  closeWebSocket(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  findConversations(ids, user?, opts?) {
    return this.couchService.findAll(this.dbName, findDocuments({ '_id': inSelector(ids), 'user': inSelector(user) }), opts);
  }

  sendNewChatAddedSignal() {
    this.newChatAdded.next();
  }

  sendNewChatSelectedSignal() {
    this.newChatSelected.next();
  }

  toggleAIServiceSignal(aiService: string) {
    this.toggleAIService.next(aiService);
  }

  setChatAIProvider(aiProvider: AIProvider) {
    this.currentChatAIProvider.next(aiProvider);
  }

  getChatAIProvider(): AIProvider {
    return this.currentChatAIProvider.getValue();
  }

  setSelectedConversationId(conversationId: object) {
    this.selectedConversationIdSubject.next(conversationId);
  }
}
