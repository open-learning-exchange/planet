import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root"
}) export class ChatService {
  private baseUrl = environment.chatAddress;

  constructor(
    private httpClient: HttpClient
  ) {}

  getPrompt(input: string): Observable<any> {
    return this.httpClient.post(this.baseUrl, {
      content: input
    });
  }

}
