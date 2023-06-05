import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Configuration, OpenAIApi } from 'openai';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// interface Message {
//   role: string;
//   content: string;
// }

@Injectable({
  providedIn: 'root',
})
export class GptPromptService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: environment.openAIKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  prompt(messages): Observable<string> {
    return from(
      this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
      })
    ).pipe(
      map((completion) => completion.data.choices[0].message.content),
      catchError((error) => {
        console.log(error);
        return throwError(error);
      })
    );
  }
}
