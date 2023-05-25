import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
const { Configuration, OpenAIApi } = require('openai');

@Component({
  selector: 'planet-gpt',
  templateUrl: './gpt.component.html'
})
export class GptComponent implements OnInit {
  promptForm: FormGroup;
  response: string;

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
    const prompt = this.promptForm.get('prompt').value;

    const res = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      temperature: 0,
      max_tokens: 256,
    });

    this.response = res['data']['choices'][0]['text'];

  }

}
