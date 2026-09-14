import { Directive, HostListener, Input } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Router } from '@angular/router';
import { FeedbackService } from './feedback.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
import { AuthService } from '../shared/auth-guard.service';
import { finalize, switchMap } from 'rxjs/operators';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { FEEDBACK_IMAGE_TYPES, FEEDBACK_MAX_IMAGES, FEEDBACK_MAX_IMAGE_SIZE, prepareFeedbackAttachments } from './feedback-attachments';
import {
  FEEDBACK_PRIORITY_OPTIONS, FEEDBACK_TYPE_OPTIONS, FeedbackTitleContext,
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
      accept: FEEDBACK_IMAGE_TYPES.join(','),
      multiple: true,
      maxFiles: FEEDBACK_MAX_IMAGES,
      maxFileSize: FEEDBACK_MAX_IMAGE_SIZE,
      imagePreview: true,
      hint: $localize`Up to three images, no larger than 2 MB each. Other users may see them, so leave out private information.`,
      typePills: [ 'PNG', 'JPEG', 'GIF', 'WebP' ]
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
    private authService: AuthService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  addFeedback(post: any, feedbackId = this.newFeedbackId(), isRetry = false) {
    if (this.isSubmitting) {
      return;
    }
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
      _id: feedbackId,
      routerLink: null,
      state: firstPart,
      titleContext: null,
    };
    if (firstPart === 'home') {
      feedback.titleContext = { kind: 'home' };
      feedback.routerLink = [ '/home' ];
      this.updateFeedback(feedback, date, user, feedbackUrl, isRetry);
    } else if (this.feedbackOf?.name) {
      feedback.titleContext = { kind: 'item', state: firstPart, name: this.feedbackOf.name };
      feedback.routerLink = [ '/', firstPart, 'view', this.feedbackOf.item ];
      this.updateFeedback(feedback, date, user, feedbackUrl, isRetry);
    } else if (urlParts.length === 2) {
      feedback.titleContext = { kind: 'section', state: firstPart };
      feedback.routerLink = [ '/', firstPart ];
      this.updateFeedback(feedback, date, user, feedbackUrl, isRetry);
    } else if (lastPart) {
      const fallbackPath = urlParts.slice(1);
      this.couchService.getDocumentByID(firstPart, lastPart).subscribe(
        (document: any) => {
          const resourceName = document?.type === 'enterprise'
            ? document?.name
            : document?.title || document?.courseTitle || document?.name || lastPart;
          feedback.titleContext = { kind: 'item', state: firstPart, name: resourceName };
          feedback.routerLink = [ '/', firstPart, 'view', lastPart ];
          this.updateFeedback(feedback, date, user, feedbackUrl, isRetry);
        },
        (error) => {
          feedback.titleContext = { kind: 'path', path: fallbackPath };
          feedback.routerLink = [ '/', ...fallbackPath ];
          this.updateFeedback(feedback, date, user, feedbackUrl, isRetry);
        }
      );
    }
  }

  private removeNavigationParams(url: string) {
    const path = url.split(/[?#]/)[0];
    return path.split('/').map(part => part.split(';')[0]).join('/');
  }

  private newFeedbackId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private updateFeedback(feedback: any, date: Date, user: string, url: string, isRetry: boolean) {
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
    prepareFeedbackAttachments(attachments?.added).pipe(
      switchMap(imageAttachments => this.couchService.updateDocument('feedback', {
        ...newFeedback,
        _attachments: imageAttachments,
        messages: [ { ...startingMessage, attachments: Object.keys(imageAttachments) } ]
      })),
      finalize(() => {
        this.isSubmitting = false;
        this.dialogsLoadingService.stop();
      })
    ).subscribe(
      () => {
        this.dialogsFormService.closeDialogsForm();
        this.feedbackService.setFeedback();
        this.planetMessageService.showMessage($localize`Thank you, your feedback is submitted!`);
      },
      (error) => {
        if (isRetry && error?.status === 409) {
          this.dialogsFormService.closeDialogsForm();
          this.feedbackService.setFeedback();
          this.planetMessageService.showAlert(
            $localize`An earlier version of this feedback was already submitted. Changes made before retrying may not have been saved.`
          );
          return;
        }
        this.dialogsFormService.showErrorMessage(
          $localize`Your feedback could not be submitted. Your text and images are still here. Please try again.`
        );
      }
    );
  }

  @HostListener('click')
  checkAuthentication() {
    this.authService.checkAuthenticationStatus().subscribe(() => this.openFeedback());
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
    const feedbackId = this.newFeedbackId();
    let hasSubmitted = false;
    this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      closeOnSubmit: false,
      confirmUnsavedChanges: true,
      onSubmit: response => {
        if (this.isSubmitting) {
          this.dialogsLoadingService.stop();
          return;
        }
        this.addFeedback(response, feedbackId, hasSubmitted);
        hasSubmitted = true;
      }
    });
  }

}
