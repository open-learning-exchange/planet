import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
const { Configuration, OpenAIApi } = require('openai');

@Component({
  selector: 'planet-gpt',
  templateUrl: './gpt.component.html',
})
export class GptComponent implements OnInit {
  promptForm: FormGroup;
  response: string;
  conversations: any[] = [];

  constructor(private formBuilder: FormBuilder, private http: HttpClient) {}

  ngOnInit() {
    this.promptForm = this.formBuilder.group({
      prompt: '',
    });
  }

  async submitPrompt() {
    const configuration = new Configuration({
      apiKey: environment.openAIKey,
    });
    const openai = new OpenAIApi(configuration);

    const content = this.promptForm.get('prompt').value;
    this.conversations.push({ role: 'user', content });

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: this.conversations,
    });

    this.response = completion.data.choices[0].message.content;
  }
}
