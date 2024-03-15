import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  private baseUrl = environment.chatAddress;
  private dbName = 'chat_history';
  private newChatAdded = new Subject<void>();
  private newChatSelected = new Subject<void>();
  private toggleAIService = new Subject<string>();
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);

  newChatAdded$ = this.newChatAdded.asObservable();
  newChatSelected$ = this.newChatSelected.asObservable();
  toggleAIService$ = this.toggleAIService.asObservable();
  selectedConversationId$: Observable<object | null> = this.selectedConversationIdSubject.asObservable();


  constructor(
    private httpClient: HttpClient,
    private couchService: CouchService
  ) {}

  fetchAIProviders() {
    return this.httpClient.get(`${this.baseUrl}/checkproviders`);
  }

  getPrompt(data: Object, save: boolean, aiProvider: Object): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      data,
      save,
      aiProvider
    });
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
