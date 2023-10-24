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
  private newChatSelected = new Subject<void>();
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);

  newChatSelected$ = this.newChatSelected.asObservable();
  selectedConversationId$: Observable<object | null> = this.selectedConversationIdSubject.asObservable();


  constructor(
    private httpClient: HttpClient,
    private couchService: CouchService
  ) {}

  getPrompt(data: Object, save: boolean): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      data,
      save
    });
  }

  findConversations(ids, opts) {
    return this.couchService.findAll(this.dbName, findDocuments({ '_id': inSelector(ids) }), opts);
  }

  sendNewChatSignal() {
    this.newChatSelected.next();
  }

  setSelectedConversationId(conversationId: object) {
    this.selectedConversationIdSubject.next(conversationId);
  }
}
