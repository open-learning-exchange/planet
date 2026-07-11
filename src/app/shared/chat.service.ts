import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { AIServices, AIProvider, ProviderName, SurveyAnalysisPayload, SurveyAnalysisResponse } from '../chat/chat.model';

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  readonly dbName = 'chat_history';

  private baseUrl = `${environment.chatAddress}${environment.production ? '/ml' : ''}`;
  private socket: WebSocket;

  private chatStreamSubject: Subject<string> = new Subject<string>();
  private errorSubject: Subject<string> = new Subject<string>();
  private newChatAdded: Subject<void> = new Subject<void>();
  private newChatSelected: Subject<void> = new Subject<void>();
  private toggleAIService = new Subject<ProviderName>();
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);
  private aiProvidersSubject = new BehaviorSubject<Array<AIProvider>>([]);
  private currentChatAIProvider = new BehaviorSubject<AIProvider>(undefined);

  newChatAdded$ = this.newChatAdded.asObservable();
  newChatSelected$ = this.newChatSelected.asObservable();
  toggleAIService$: Observable<ProviderName> = this.toggleAIService.asObservable();
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
      this.socket = new WebSocket(this.baseUrl.replace(/^http/, 'ws'));
      this.socket.onerror = (error) => {
        this.errorSubject.next('WebSocket connection error');
      };
      this.socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'error') {
            this.errorSubject.next(message.message || message.error);
          } else {
            this.chatStreamSubject.next(event.data);
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
          return of(null);
        }),
        map((services: AIServices | null) => {
          if (services) {
            return (Object.entries(services) as [ ProviderName, AIServices[ProviderName] ][])
              .filter(([ _, service ]) => service?.enabled === true)
              .map(([ key ]) => ({ name: key }));
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

  getPrompt(data: object, save: boolean): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/`, {
      data,
      save,
    }, { withCredentials: true });
  }

  analyzeSurvey(payload: SurveyAnalysisPayload): Observable<SurveyAnalysisResponse> {
    // Default to an enabled provider — the gateway falls back to OpenAI, which 503s
    // on communities where only another provider is configured
    const provider = payload.aiProvider || this.currentChatAIProvider.value || this.aiProvidersSubject.value[0];
    const body = provider ? { ...payload, aiProvider: { name: provider.name } } : payload;
    return this.httpClient.post<SurveyAnalysisResponse>(`${this.baseUrl}/analyze`, body, { withCredentials: true });
  }

  // Cleans up the OpenAI vector store + files for a resource; call before deleting the resource doc.
  // Deletion should not be blocked on the gateway, so failures are reported, not thrown:
  // a missing resource/index is fine, anything else is flagged so the caller can warn about the leak.
  // Stripping the index bumps the resource's _rev; the new rev is passed back for follow-up deletes.
  removeResourceIndex(resourceId: string): Observable<{ cleanupFailed?: boolean; rev?: string }> {
    return this.httpClient.delete(`${this.baseUrl}/resources/${resourceId}/index`, { withCredentials: true }).pipe(
      map((response: any) => ({ rev: response?.rev })),
      catchError((err) => {
        if (err?.status === 404) {
          return of({});
        }
        console.error(err);
        return of({ cleanupFailed: true });
      })
    );
  }

  // Subscribe to stream updates
  getChatStream(): Observable<string> {
    return this.chatStreamSubject.asObservable();
  }

  getErrorStream(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  // Method to send user input via WebSocket
  sendUserInput(data: any): void {
    if (this.socket.readyState === WebSocket.OPEN) {
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

  toggleAIServiceSignal(aiService: ProviderName) {
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
