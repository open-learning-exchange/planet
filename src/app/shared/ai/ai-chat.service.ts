import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, ReplaySubject, Subject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AIServiceStatus, AIProvider, ChatStreamMessage, Conversation, ConversationChange, ProviderName } from '../../chat/chat.model';

@Injectable({
  providedIn: 'root'
}) export class AiChatService {
  private baseUrl = `${environment.chatAddress}${environment.production ? '/ml' : ''}`;
  private conversationsUrl = `${environment.chatAddress}${environment.production ? '/api' : ''}/chat/conversations`;

  private newChatAdded: Subject<void> = new Subject<void>();
  private newChatSelected: Subject<void> = new Subject<void>();
  private toggleAIService = new ReplaySubject<ProviderName>(1);
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
    private httpClient: HttpClient
  ) {
    this.fetchAIProviders();
  }

  private fetchAIProviders() {
    this.httpClient
      .get<{ providers: AIServiceStatus[] }>(`${this.baseUrl}/checkproviders`)
      .pipe(
        map(({ providers }) => providers.filter(({ configured }) => configured)),
        catchError((err) => {
          console.error(err);
          return of([]);
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

  // One socket per turn, so no idle socket is left for a proxy timeout or a gateway restart to close
  streamPrompt(data: object): Observable<ChatStreamMessage> {
    return new Observable<ChatStreamMessage>((subscriber) => {
      const socket = new WebSocket(this.baseUrl.replace(/^http/, 'ws'));
      socket.onopen = () => socket.send(JSON.stringify(data));
      socket.onmessage = (event) => {
        const message: ChatStreamMessage | { type: 'error', error: string } = JSON.parse(event.data);
        if (message.type === 'error') {
          subscriber.error(new Error(message.error));
          return;
        }
        subscriber.next(message);
        if (message.type === 'final') {
          subscriber.complete();
        }
      };
      socket.onclose = () => subscriber.error(new Error('WebSocket connection error'));
      return () => socket.close();
    });
  }

  listConversations(): Observable<Conversation[]> {
    return this.httpClient.get<Conversation[]>(this.conversationsUrl, { withCredentials: true });
  }

  getConversation(id: string): Observable<Conversation> {
    return this.httpClient.get<Conversation>(`${this.conversationsUrl}/${id}`, { withCredentials: true });
  }

  updateConversation(id: string, change: ConversationChange): Observable<Conversation> {
    return this.httpClient.patch<Conversation>(`${this.conversationsUrl}/${id}`, change, { withCredentials: true });
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
