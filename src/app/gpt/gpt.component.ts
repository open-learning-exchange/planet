import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from "@angular/core";
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

  @ViewChild("chat") chatContainer: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private gptPromptService: GptPromptService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.createForm();
  }

  scrollToBottom(): void {
    this.chatContainer.nativeElement.scrollTo({
      top: this.chatContainer.nativeElement.scrollHeight,
      behavior: "smooth",
    });
  }

  createForm() {
    this.promptForm = this.formBuilder.group({
      prompt: ["", CustomValidators.requiredMarkdown],
    });
  }

  goBack() {
    this.router.navigate(["/"], { relativeTo: this.route });
  }

  onSubmit() {
    if (!this.promptForm.valid) {
      showFormErrors(this.promptForm.controls);
      return;
    }

    // this.spinnerOn=true;
    this.submitPrompt();
    // this.spinnerOn=false;
  }

  submitPrompt() {
    const content = this.promptForm.get("prompt").value;
    this.messages.push({ role: "user", content });

    this.gptPromptService.prompt(this.messages).subscribe(
      (completion: string) => {
        this.conversations.push({
          query: content,
          response: completion,
        });
        this.changeDetectorRef.detectChanges();
        this.scrollToBottom();
      },
      (error: any) => {
        console.log(error);
      }
    );
  }
}
