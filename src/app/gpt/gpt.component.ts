import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { environment } from "../../environments/environment";
import { CustomValidators } from "../validators/custom-validators";
import { showFormErrors } from "../shared/table-helpers";

const { Configuration, OpenAIApi } = require("openai");

@Component({
  selector: "planet-gpt",
  templateUrl: "./gpt.component.html",
  styleUrls: ["./gpt.component.scss"],
})
export class GptComponent implements OnInit {
  // spinnerOn=true;
  promptForm: FormGroup;
  questions: any[] = [];
  conversations: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.createForm();
  }

  createForm() {
    this.promptForm = this.formBuilder.group({
      prompt: ["", CustomValidators.requiredMarkdown],
    });
  }

  goBack() {
    this.router.navigate(["/"], { relativeTo: this.route });
  }

  async onSubmit() {
    if (!this.promptForm.valid) {
      showFormErrors(this.promptForm.controls);
      return;
    }

    // this.spinnerOn=true;
    await this.submitPrompt();
    // this.spinnerOn=false;
  }

  async submitPrompt() {
    try {
      const configuration = new Configuration({
        apiKey: environment.openAIKey,
      });
      const openai = new OpenAIApi(configuration);

      const content = this.promptForm.get("prompt").value;
      this.questions.push({ role: "user", content });

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: this.questions,
      });

      this.conversations.push({
        query: content,
        response: completion.data.choices[0].message.content,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
