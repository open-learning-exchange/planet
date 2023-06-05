import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { CustomValidators } from "../validators/custom-validators";
import { showFormErrors } from "../shared/table-helpers";
import { GptPromptService } from "../shared/gpt-prompt.service";

@Component({
  selector: "planet-gpt",
  templateUrl: "./gpt.component.html",
  styleUrls: ["./gpt.component.scss"],
})
export class GptComponent implements OnInit {
  // spinnerOn=true;
  promptForm: FormGroup;
  messages: any[] = [];
  conversations: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private gptPromptService: GptPromptService
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
    const content = this.promptForm.get("prompt").value;
    console.log(content)
    console.log(typeof content)
    this.messages.push({ role: "user", content });

    const completion = await this.gptPromptService.prompt(this.messages);

    this.conversations.push({
      query: content,
      response: completion
    });
  }
}
