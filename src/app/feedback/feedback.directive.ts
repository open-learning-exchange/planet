import { Directive, HostListener, Input } from '@angular/core';
import { Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { defer, Observable, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { StateService } from '@shared/state.service';
import { AuthGuard } from '@shared/auth/auth.guard';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';
import { PendingAttachment } from '@shared/forms/file-upload.component';
import { normalizeImage, withImageAttachments } from '@shared/utils';

import { FeedbackService } from './feedback.service';
import { CustomValidators } from '../validators/custom-validators';
import {
  FEEDBACK_PRIORITY_OPTIONS, FEEDBACK_SCREENSHOT_TYPES, FEEDBACK_TYPE_OPTIONS, FeedbackTitleContext,
  normalizeFeedbackPriority, normalizeFeedbackStatus, normalizeFeedbackType,
} from './feedback.utils';

export class Message {
  message: string;
  user: string;
  time: any;
  attachments?: string[];
}
export class Feedback {
  type: string;
  priority: string;
  owner: string;
  title: string;
  titleContext?: FeedbackTitleContext;
  openTime: any;
  closeTime: any;
  source: string;
  url: string;
  messages: Array<Message>;
  params: object;
}

const dialogFieldOptions = [
  {
    label: $localize`Is your feedback Urgent?`,
    type: 'radio',
    name: 'priority',
    options: FEEDBACK_PRIORITY_OPTIONS.map(option => ({ name: option.label, value: option.value })),
    required: true
  },
  {
    label: $localize`Feedback Type:`,
    type: 'radio',
    name: 'type',
    options: FEEDBACK_TYPE_OPTIONS.map(option => ({ name: option.label, value: option.value })),
    required: true
  },
  {
    type: 'textarea',
    name: 'message',
    placeholder: $localize`Your Feedback`,
    required: true
  },
  {
    type: 'file-upload',
    name: 'attachments',
    placeholder: $localize`Screenshots (optional)`,
    fileUpload: {
      accept: FEEDBACK_SCREENSHOT_TYPES.join(','),
      multiple: true,
      maxFiles: 3,
      imagePreview: true,
      hint: $localize`Up to three images. Other users may see them, so leave out private information.`,
      typePills: [ 'PNG', 'JPEG', 'WebP' ]
    }
  }
];

@Directive({ selector: '[planetFeedback]' })
export class FeedbackDirective {
  @Input() feedbackOf: any = {};
  @Input() message = '';
  @Input() type = '';
  @Input() priority = '';
  private isSubmitting = false;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private router: Router,
    private feedbackService: FeedbackService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private authGuard: AuthGuard,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogGuard: DialogGuardService
  ) {}

  addFeedback(post: any) {
    this.isSubmitting = true;
    this.dialogsFormService.showErrorMessage('');
    const date = new Date();
    const user = this.userService.get().name;
    const feedbackUrl = this.router.url || '/';
    const navigationUrl = feedbackUrl !== '/' ? this.removeNavigationParams(feedbackUrl).replace(/\/+$/, '') : '/';
    const urlParts = navigationUrl.split('/');
    const firstPart = urlParts[1] || 'home';
    const lastPart = urlParts.length > 2 ? urlParts[urlParts.length - 1] : null;
    const feedback: any = {
      ...post,
      routerLink: null,
      state: firstPart,
      titleContext: null,
    };
    if (firstPart === 'home') {
      feedback.titleContext = { kind: 'home' };
      feedback.routerLink = [ '/home' ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (this.feedbackOf?.name) {
      feedback.titleContext = { kind: 'item', state: firstPart, name: this.feedbackOf.name };
      feedback.routerLink = [ '/', firstPart, 'view', this.feedbackOf.item ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (urlParts.length === 2) {
      feedback.titleContext = { kind: 'section', state: firstPart };
      feedback.routerLink = [ '/', firstPart ];
      this.updateFeedback(feedback, date, user, feedbackUrl);
    } else if (lastPart) {
      const fallbackPath = urlParts.slice(1);
      this.couchService.getDocumentByID(firstPart, lastPart).subscribe(
        (document: any) => {
          const resourceName = document?.type === 'enterprise'
            ? document?.name
            : document?.title || document?.courseTitle || document?.name || lastPart;
          feedback.titleContext = { kind: 'item', state: firstPart, name: resourceName };
          feedback.routerLink = [ '/', firstPart, 'view', lastPart ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        },
        (error) => {
          feedback.titleContext = { kind: 'path', path: fallbackPath };
          feedback.routerLink = [ '/', ...fallbackPath ];
          this.updateFeedback(feedback, date, user, feedbackUrl);
        }
      );
    }
  }

  private removeNavigationParams(url: string) {
    const path = url.split(/[?#]/)[0];
    return path.split('/').map(part => part.split(';')[0]).join('/');
  }

  private updateFeedback(feedback: any, date: Date, user: string, url: string) {
    const { attachments, ...feedbackValues } = feedback;
    const startingMessage: Message = { message: feedback.message, time: date, user };
    const newFeedback: Feedback = {
      owner: user,
      ...feedbackValues,
      openTime: date,
      status: normalizeFeedbackStatus('open'),
      type: normalizeFeedbackType(feedback.type),
      priority: normalizeFeedbackPriority(feedback.priority),
      messages: [ startingMessage ],
      url,
      source: this.stateService.configuration.code,
      parentCode: this.stateService.configuration.parentCode,
      ...this.feedbackOf,
    };
    const addedScreenshots: PendingAttachment[] = attachments?.added || [];
    const feedback$: Observable<{ doc: any, added: string[], skipped: string[] }> = addedScreenshots.length ?
      defer(() => withImageAttachments(
        newFeedback, { added: addedScreenshots }, (file, usedNames) => normalizeImage(file, { maxDimension: 1920, usedNames })
      )) :
      of({ doc: newFeedback, added: [], skipped: [] });
    feedback$.pipe(
      switchMap(({ doc, added, skipped }) => {
        if (added.length) {
          startingMessage.attachments = added;
        }
        return this.couchService.updateDocument('feedback', doc).pipe(map(() => skipped.length));
      }),
      finalize(() => {
        this.isSubmitting = false;
        this.dialogsLoadingService.stop();
      })
    ).subscribe(
      (skippedScreenshots) => {
        this.dialogsFormService.closeDialogsForm();
        this.feedbackService.setFeedback();
        if (skippedScreenshots) {
          this.planetMessageService.showAlert($localize`Feedback submitted, but some screenshots could not be included.`);
        } else {
          this.planetMessageService.showMessage($localize`Thank you, your feedback is submitted!`);
        }
      },
      () => {
        this.dialogsFormService.showErrorMessage(
          $localize`Your feedback could not be submitted. Your text and images are still here. Please try again.`
        );
      }
    );
  }

  @HostListener('click')
  checkAuthentication() {
    this.dialogGuard.open('feedback', () =>
      this.authGuard.checkAuthenticationStatus().pipe(map(() => this.openFeedback()))
    ).subscribe();
  }

  openFeedback() {
    const title = $localize`Feedback`;
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ this.priority ? normalizeFeedbackPriority(this.priority) : '', Validators.required ],
      type: [ this.type ? normalizeFeedbackType(this.type) : '', Validators.required ],
      message: [ this.message, CustomValidators.required ],
      attachments: [ { retained: [], removed: [], added: [] } ]
    };
    return this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      closeOnSubmit: false,
      confirmUnsavedChanges: true,
      onSubmit: response => {
        if (this.isSubmitting) {
          this.dialogsLoadingService.stop();
          return;
        }
        this.addFeedback(response);
      }
    });
  }

}
