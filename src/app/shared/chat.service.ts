import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  readonly dbName = 'chat_history';

  private baseUrl = environment.chatAddress;
  private socket: WebSocket;

  private chatStreamSubject: Subject<string> = new Subject<string>();
  private errorSubject: Subject<string> = new Subject<string>();
  private newChatAdded: Subject<void> = new Subject<void>();
  private newChatSelected: Subject<void> = new Subject<void>();
  private toggleAIService = new Subject<string>();
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);

  newChatAdded$ = this.newChatAdded.asObservable();
  newChatSelected$ = this.newChatSelected.asObservable();
  toggleAIService$ = this.toggleAIService.asObservable();
  selectedConversationId$: Observable<object | null> = this.selectedConversationIdSubject.asObservable();


  constructor(
    private httpClient: HttpClient,
    private couchService: CouchService
  ) { }

  initializeWebSocket() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = new WebSocket('ws' + this.baseUrl.slice(4));
      this.socket.onerror = (error) => {
        this.errorSubject.next('WebSocket error');
      };
      this.socket.addEventListener('message', (event) => {
        this.chatStreamSubject.next(event.data);
      });
    }
  }

  fetchAIProviders() {
    return this.httpClient.get(`${this.baseUrl}/checkproviders`);
  }

  getPrompt(data: Object, save: boolean): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      data,
      save,
    });
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

  toggleAIServiceSignal(aiService: string) {
    this.toggleAIService.next(aiService);
  }

  setSelectedConversationId(conversationId: object) {
    this.selectedConversationIdSubject.next(conversationId);
  }
}
