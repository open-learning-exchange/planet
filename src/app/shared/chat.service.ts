import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
}) export class ChatService {
  private baseUrl = environment.chatAddress;
  private socket: WebSocket;
  private chatStreamSubject: Subject<string> = new Subject<string>();

  constructor(private httpClient: HttpClient) {
    this.socket = new WebSocket('ws' + this.baseUrl.slice(4));

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      this.chatStreamSubject.next(event.data);
    });
  }

  // Regular http request
  getPrompt(input: string): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      content: input
    });
  }

  // Subscribe to stream updates
  getChatStream(): Observable<string> {
    return this.chatStreamSubject.asObservable();
  }

  // Method to send user input via WebSocket
  sendUserInput(input: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(input);
    }
  }

  // Function to close ws connection
  closeWebSocket(): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}
