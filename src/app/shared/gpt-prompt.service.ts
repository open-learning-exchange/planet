import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Configuration, OpenAIApi } from "openai";

// interface Message {
//   role: string;
//   content: string;
// }

@Injectable({
  providedIn: "root",
})
export class GptPromptService {
  openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: environment.openAIKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async prompt(messages): Promise<string> {
    try {
      const completion = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
      });
      return completion.data.choices[0].message.content;
    } catch(err) {
      console.error(err);
    }
  }

}
