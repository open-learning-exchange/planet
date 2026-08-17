import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, ReplaySubject, Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import {
  AIServiceDiscovery,
  AIServiceStatus,
  AIProvider,
  ChatStreamMessage,
  ProviderName,
  ResourceIndexCleanupResponse,
  SurveyAnalysisPayload,
  SurveyAnalysisResponse
} from '../chat/chat.model';

const PROVIDER_DISCOVERY_RETRY_MS = 5000;

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  readonly dbName = 'chat_history';

  private baseUrl = `${environment.chatAddress}${environment.production ? '/ml' : ''}`;
  private socket?: WebSocket;
  private pendingSocket?: WebSocket;

  private chatStreamSubject: Subject<ChatStreamMessage> = new Subject<ChatStreamMessage>();
  private errorSubject: Subject<string> = new Subject<string>();
  private newChatAdded: Subject<void> = new Subject<void>();
  private newChatSelected: Subject<void> = new Subject<void>();
  private toggleAIService = new ReplaySubject<ProviderName>(1);
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);
  private aiProvidersSubject = new BehaviorSubject<Array<AIProvider>>([]);
  // undefined until the first attempt settles, null when it failed with nothing cached to keep.
  private aiServiceDiscoverySubject = new BehaviorSubject<AIServiceDiscovery | null | undefined>(undefined);
  private providerDiscoveryInFlight = false;
  private providerDiscoveryQueued = false;
  private providerDiscoveryRetryAt = 0;
  private currentChatAIProvider = new BehaviorSubject<AIProvider>(undefined);

  newChatAdded$ = this.newChatAdded.asObservable();
  newChatSelected$ = this.newChatSelected.asObservable();
  toggleAIService$: Observable<ProviderName> = this.toggleAIService.asObservable();
  aiProviders$ = this.aiProvidersSubject.asObservable();
  selectedConversationId$: Observable<object | null> = this.selectedConversationIdSubject.asObservable();
  currentChatAIProvider$: Observable<AIProvider> = this.currentChatAIProvider.asObservable();

  constructor(
    private httpClient: HttpClient,
    private couchService: CouchService,
    @Inject(LOCALE_ID) private localeId: string
  ) {}

  chatErrorMessage(error: { code?: string; message?: string } | undefined, fallback = $localize`Chat request failed`): string {
    if (error?.code === 'resource_attachments_unsupported') {
      return $localize`This AI provider does not support resource attachments. Select a provider that does.`;
    }
    if (error?.code === 'resource_context_unavailable') {
      return $localize`This resource is unavailable for AI chat. Reload the course step or ask a manager for access.`;
    }
    return error?.message || fallback;
  }

  private webSocketUrl(): string {
    return this.baseUrl.replace(/^http/, 'ws').replace(/\/?$/, '/');
  }

  private initializeWebSocket() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
      const socket = new WebSocket(this.webSocketUrl());
      this.socket = socket;
      let errorReported = false;
      const reportConnectionError = (message: string, suppressDuplicate = false) => {
        if (socket === this.socket && (!suppressDuplicate || !errorReported)) {
          errorReported = true;
          this.errorSubject.next(message);
        }
      };
      socket.onerror = () => reportConnectionError('WebSocket connection error', true);
      socket.onclose = () => {
        if (socket === this.socket) {
          const requestWasPending = this.pendingSocket === socket;
          if (requestWasPending) {
            this.pendingSocket = undefined;
          }
          this.socket = undefined;
          if (requestWasPending && !errorReported) {
            this.errorSubject.next('WebSocket connection closed');
          }
        }
      };
      socket.addEventListener('message', (event) => {
        if (socket !== this.socket) {
          return;
        }
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'error') {
            if (this.pendingSocket === socket) {
              this.pendingSocket = undefined;
            }
            reportConnectionError(this.chatErrorMessage(message, message.error));
            socket.close();
          } else {
            errorReported = false;
            if (message.type === 'final' && this.pendingSocket === socket) {
              this.pendingSocket = undefined;
            }
            this.chatStreamSubject.next(message as ChatStreamMessage);
            if (message.type === 'final') {
              socket.close();
            }
          }
        } catch (error) {
          reportConnectionError('Invalid message format');
        }
      });
    }
  }

  refreshAIProviders(): void {
    this.loadAIProviders(true);
  }

  private ensureAIProviders(): void {
    this.loadAIProviders(false);
  }

  private loadAIProviders(force: boolean): void {
    // Back off transient discovery failures without permanently disabling discovery for the session.
    const cachedDiscovery = this.aiServiceDiscoverySubject.value;
    if (!force && cachedDiscovery !== undefined &&
      (cachedDiscovery !== null || Date.now() < this.providerDiscoveryRetryAt)) {
      return;
    }
    if (this.providerDiscoveryInFlight) {
      // An in-flight response predates a forced refresh, so run again once it settles.
      this.providerDiscoveryQueued = this.providerDiscoveryQueued || force;
      return;
    }
    this.providerDiscoveryInFlight = true;
    this.httpClient
      .get<AIServiceDiscovery>(`${this.baseUrl}/checkproviders`, { withCredentials: true })
      .pipe(
        catchError((err) => {
          console.error(err);
          return of(null);
        })
      )
      .subscribe((discovery) => {
        this.providerDiscoveryInFlight = false;
        if (this.providerDiscoveryQueued) {
          this.providerDiscoveryQueued = false;
          this.loadAIProviders(true);
          return;
        }
        if (discovery) {
          const providers = (Object.entries(discovery.providers) as [ string, AIServiceStatus ][])
            .filter(([ _, service ]) => service?.enabled === true)
            .map(([ name, service ]) => ({
              name,
              'label': service.label || name,
              'capabilities': service.capabilities || [],
              'fileSearchContentTypes': service.fileSearchContentTypes || []
            }));
          this.aiServiceDiscoverySubject.next(discovery);
          this.aiProvidersSubject.next(providers);
        } else if (!this.aiServiceDiscoverySubject.value) {
          this.aiServiceDiscoverySubject.next(null);
          this.providerDiscoveryRetryAt = Date.now() + PROVIDER_DISCOVERY_RETRY_MS;
        }
      });
  }

  listAIProviders(): Observable<Array<AIProvider>> {
    this.ensureAIProviders();
    return this.aiProviders$;
  }

  getAIServiceDiscovery(): Observable<AIServiceDiscovery | null | undefined> {
    this.ensureAIProviders();
    return this.aiServiceDiscoverySubject.asObservable();
  }

  getPrompt(data: object, save: boolean): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/`, {
      'data': this.withLocale(data),
      save,
    }, { withCredentials: true });
  }

  analyzeSurvey(payload: SurveyAnalysisPayload): Observable<SurveyAnalysisResponse> {
    const provider = payload.aiProvider || this.getPreferredAnalysisProvider();
    const body = this.withLocale(provider ? { ...payload, aiProvider: { name: provider.name } } : payload);
    return this.httpClient.post<SurveyAnalysisResponse>(`${this.baseUrl}/analyze`, body, { withCredentials: true });
  }

  getPreferredAnalysisProvider(): AIProvider | undefined {
    const providers = this.aiProvidersSubject.value;
    return providers.find((provider) => provider.capabilities?.includes('structuredOutput')) || providers[0];
  }

  hasFileSearchProvider(): boolean {
    return this.aiProvidersSubject.value.some((provider) => provider.capabilities?.includes('fileSearch'));
  }

  // Attempts immediate cleanup; retained local state lets the gateway retry after resource deletion.
  removeResourceIndexes(resourceIds: string[]): Observable<ResourceIndexCleanupResponse> {
    return this.httpClient.post<ResourceIndexCleanupResponse>(
      `${this.baseUrl}/resources/indexes/cleanup`,
      { resourceIds },
      { withCredentials: true }
    );
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
    let socket = this.socket;
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      this.initializeWebSocket();
      socket = this.socket;
    }
    if (!socket) {
      this.errorSubject.next('WebSocket connection error');
      return;
    }
    const send = () => {
      if (socket === this.socket && socket.readyState === WebSocket.OPEN) {
        this.pendingSocket = socket;
        socket.send(JSON.stringify(this.withLocale(data)));
      }
    };
    if (socket.readyState === WebSocket.OPEN) {
      send();
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener('open', send, { once: true });
    }
  }

  private withLocale<T extends object>(data: T): T & { locale: string } {
    return { ...data, 'locale': this.localeId };
  }

  // Function to close ws connection
  closeWebSocket(): void {
    const socket = this.socket;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      if (this.pendingSocket === socket) {
        this.pendingSocket = undefined;
      }
      socket.close();
    }
  }

  findConversations(ids, user?, opts?) {
    return this.couchService.findAll(this.dbName, findDocuments({ _id: inSelector(ids), user: inSelector(user) }), opts);
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
