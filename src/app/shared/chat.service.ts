import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  private baseUrl = environment.chatAddress;
  private dbName = 'chat_history';
  private selectedConversationIdSubject = new BehaviorSubject<object | null>(null);
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

  setSelectedConversationId(conversationId: object) {
    this.selectedConversationIdSubject.next(conversationId);
  }
}
