import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CoursesService } from '../courses.service';
import { DialogsAddResourcesComponent } from '../../shared/dialogs/dialogs-add-resources.component';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { PdfExtractionService } from '../../shared/pdf-extract.service';
import { ChatService } from '../../shared/chat.service';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  selector: 'planet-courses-step',
  templateUrl: 'courses-step.component.html',
  styleUrls: [ 'courses-step.scss' ],
  encapsulation: ViewEncapsulation.None,
})
export class CoursesStepComponent implements OnDestroy {
  @Input() steps: any[];
  @Output() stepsChange = new EventEmitter<any>();
  @Output() addStepEvent = new EventEmitter<void>();

  stepForm: FormGroup;
  dialogRef: MatDialogRef<DialogsAddResourcesComponent>;
  activeStep: any;
  activeStepIndex = -1;
  private onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private coursesService: CoursesService,
    private chatService: ChatService,
    private couchService: CouchService,
    private userService: UserService,
    private pdfExtractionService: PdfExtractionService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.stepForm = this.fb.group({
      id: '',
      stepTitle: '',
      description: '',
    });
    this.stepForm.valueChanges
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((value) => {
        this.steps[this.activeStepIndex] = { ...this.activeStep, ...value };
        this.stepsChange.emit(this.steps);
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  stepClick(index: number) {
    this.activeStepIndex = index;
    if (index > -1) {
      this.activeStep = this.steps[index];
      this.stepForm.patchValue(this.steps[index]);
    }
  }

  addResources() {
    this.dialogRef = this.dialog.open(DialogsAddResourcesComponent, {
      width: '80vw',
      data: {
        okClick: this.resourcsDialogOkClick.bind(this),
        excludeIds: this.steps[this.activeStepIndex].resources.map(
          (resource: any) => resource._id
        ),
        canAdd: true,
      },
    });
  }

  resourcsDialogOkClick(selected: any) {
    this.steps[this.activeStepIndex].resources = [
      ...this.steps[this.activeStepIndex].resources,
      ...selected.map((res) => res.doc),
    ];
    this.activeStep = this.steps[this.activeStepIndex];
    this.stepsChange.emit(this.steps);
    this.dialogsLoadingService.stop();
    this.dialogRef.close();
  }

  removeResource(position: number) {
    this.steps[this.activeStepIndex].resources.splice(position, 1);
  }

  addExam(type = 'exam') {
    this.coursesService.stepIndex = this.activeStepIndex;
    if (this.activeStep[type]) {
      this.router.navigate([
        '/courses/update/exam/',
        this.activeStep[type]._id,
        { type },
      ]);
    } else {
      this.router.navigate([ '/courses/exam/', { type } ]);
    }
  }

  stepsMoved(steps) {
    this.steps = steps;
    this.stepsChange.emit(this.steps);
  }

  addStep() {
    this.addStepEvent.emit();
  }

  generateDescription() {
    let extractedText;

    const resource = this.steps[this.activeStepIndex].resources[0];
    const attachmentName = Object.keys(resource._attachments)[0];
    this.couchService
      .getAttachmentAsBlob(resource._id, attachmentName)
      .subscribe(
        (blob) => {
          const file = new File([ blob ], attachmentName, { type: blob.type });
          this.pdfExtractionService
            .extractTextFromPdf(file)
            .then((text) => {
              extractedText = $localize`This is a course creation process and You are tasked with using the data provided to generate a course. Output only the markdown for the course.}`;
              this.chatService
                .getPrompt(
                  {
                    user: this.userService.get().name,
                    content: `Generate a comprehensive course on ${this.steps[this.activeStepIndex].stepTitle} using this data: ${text}`,
                    aiProvider: { name: 'openai' },
                    assistant: true,
                    context: extractedText,
                  },
                  false
                )
                .subscribe(
                  (completion: any) => {
                    console.log(completion);

                    this.steps[this.activeStepIndex].description =
                      completion?.chat;
                    this.stepsChange.emit(this.steps);
                  },
                  (error: any) => {
                    console.error(error);
                  }
                );
            })
            .catch((error) => {
              console.error('Error extracting text from PDF:', error);
            });
        },
        (error) => {
          console.error('Error fetching attachment from CouchDB:', error);
        }
      );
  }
}
