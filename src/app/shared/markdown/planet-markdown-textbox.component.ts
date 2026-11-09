import {
  AfterViewInit, Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, OnInit, ViewEncapsulation, ElementRef,
  DoCheck, ViewChild, NgZone
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';
import { MarkdownImagesDialogComponent } from './markdown-images-dialog.component';
import { MarkdownRenderService } from './markdown-render.service';
import { normalizeMarkdownWhitespace } from '@shared/utils';
import { NgClass } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface ImageInfo { resourceId: string, filename: string, markdown: string }
export interface ValueWithImages { text: string, images: ImageInfo[] }
interface FullscreenState {
  owner: HTMLElement;
  actions: HTMLElement;
  formField?: HTMLElement;
  layoutObserver?: ResizeObserver;
}

@Component({
  selector: 'planet-markdown-textbox',
  templateUrl: './planet-markdown-textbox.component.html',
  styleUrls: ['planet-markdown-textbox.scss'],
  providers: [
    { provide: MatFormFieldControl, useExisting: PlanetMarkdownTextboxComponent },
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [NgClass]
})
export class PlanetMarkdownTextboxComponent implements ControlValueAccessor, AfterViewInit, DoCheck, OnInit, OnDestroy {

  static nextId = 0;
  // Action-row containers this component knows how to pin during fullscreen; a form whose
  // action row uses a class not listed here keeps the old behavior (buttons hidden behind the overlay).
  private static readonly actionSelector =
    '.mat-mdc-dialog-actions, .actions-container, .exam-buttons, .action-buttons, div.action-button';

  @HostBinding() id = `planet-markdown-textbox-${PlanetMarkdownTextboxComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  @HostBinding('class.is-invalid') get isInvalid() {
    return this.errorState;
  }
  @HostBinding('class.is-focused') get isFocused() {
    return this.focused;
  }
  @ViewChild('textarea') textarea: ElementRef<HTMLTextAreaElement>;
  @Input() _value: ValueWithImages | string;
  get value(): ValueWithImages | string {
    return this._value;
  }
  set value(newValue: ValueWithImages | string) {
    this._value = newValue || (this.imageGroup ? { text: '', images: [] } : '');
    this.textValue = typeof this._value === 'string' ? this._value : this._value.text;
    this.onChange(this._value);
    this.stateChanges.next();
  }
  #textValue: string;
  get textValue(): string {
    return this.#textValue;
  }
  set textValue(newText: string) {
    this.#textValue = newText;
    if (newText !== (typeof this._value === 'string' ? this._value : this._value.text)) {
      this.value = typeof this._value === 'string' ? newText : { ...this._value, text: newText };
    }
    if (this.easyMDE && this.easyMDE.value() !== newText) {
      this.ngZone.runOutsideAngular(() => this.easyMDE.value(newText));
    }
  }
  @Output() valueChanges = new EventEmitter<string[]>();

  get empty() {
    return (typeof this._value === 'string' ? this._value : this._value.text).length === 0;
  }

  private fullscreenState?: FullscreenState;
  private dialogDisableClose: boolean | undefined;
  private easyMDE: any;
  private destroyed = false;
  #placeholder: string;
  @Input()
  get placeholder() {
    return this.#placeholder;
  }
  set placeholder(text: string) {
    this.#placeholder = text;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean {
    return this.#required;
  }
  set required(value: boolean) {
    this.#required = value;
    this.stateChanges.next();
  }
  #required = false;

  get shouldLabelFloat() {
    return true;
  }

  @Input() imageGroup: 'community' | { [db: string]: string };
  onTouched;
  stateChanges = new Subject<void>();
  focused = false;
  errorState = false;
  options: any = {
    autoDownloadFontAwesome: false,
    autoRefresh: true,
    hideIcons: [ 'image' ],
    minHeight: 'var(--planet-markdown-textbox-height)',
    onToggleFullScreen: (isFullscreen: boolean) => {
      this.setFullscreenLayout(isFullscreen);
      this.holdDialogOpen(isFullscreen);
    },
    previewRender: (text: string) => this.renderPreview(text),
    spellChecker: false
  };

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private dialog: MatDialog,
    private ngZone: NgZone,
    private markdownRenderer: MarkdownRenderService,
    @Optional() private dialogRef: MatDialogRef<unknown>
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    focusMonitor.monitor(elementRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngDoCheck() {
    this.checkHighlight();
  }

  ngOnInit() {
    const imageToolbarIcon = {
      name: 'custom',
      action: () => this.ngZone.run(() => this.addImage()),
      className: 'fa fa-image',
      title: $localize`Add Image`
    };
    this.options = {
      ...this.options,
      ...(this.imageGroup ?
        {
          toolbar: [
            {
              name: 'bold',
              action: (editor: any) => editor.toggleBold(),
              className: 'fa fa-bold',
              title: $localize`Bold`
            },
            {
              name: 'italic',
              action: (editor: any) => editor.toggleItalic(),
              className: 'fa fa-italic',
              title: $localize`Italic`
            },
            {
              name: 'heading',
              action: (editor: any) => editor.toggleHeadingSmaller(),
              className: 'fa fa-heading',
              title: $localize`Heading`
            },
            '|',
            {
              name: 'quote',
              action: (editor: any) => editor.toggleBlockquote(),
              className: 'fa fa-quote-left',
              title: $localize`Quote`
            },
            {
              name: 'unordered-list',
              action: (editor: any) => editor.toggleUnorderedList(),
              className: 'fa fa-list-ul',
              title: $localize`Unordered List`
            },
            {
              name: 'ordered-list',
              action: (editor: any) => editor.toggleOrderedList(),
              className: 'fa fa-list-ol',
              title: $localize`Ordered List`
            },
            '|',
            {
              name: 'link',
              action: (editor: any) => editor.drawLink(),
              className: 'fa fa-link',
              title: $localize`Link`
            },
            imageToolbarIcon, '|',
            {
              name: 'preview',
              action: (editor: any) => editor.togglePreview(),
              className: 'fa fa-eye',
              noDisable: true,
              title: $localize`Preview`
            },
            {
              name: 'side-by-side',
              action: (editor: any) => editor.toggleSideBySide(),
              className: 'fa fa-columns',
              noDisable: true,
              title: $localize`Side by Side`
            },
            {
              name: 'fullscreen',
              action: (editor: any) => editor.toggleFullScreen(),
              className: 'fa fa-arrows-alt',
              noDisable: true,
              title: $localize`Fullscreen`
            },
            '|',
            {
              name: 'guide',
              action: 'https://www.markdownguide.org/basic-syntax/',
              className: 'fa fa-question-circle',
              noDisable: true,
              title: $localize`Markdown Guide`
            }
          ]
        } :
        {}
      )
    };
    this._value = this.imageGroup ? { text: '', images: [] } : '';
  }

  ngAfterViewInit() {
    // The first write lands before registerOnChange, and forms read their { text, images } value from this echo.
    Promise.resolve().then(() => {
      if (!this.destroyed) {
        this.writeValue(this.textValue);
      }
    });
    this.loadEditor().then(({ default: EasyMDE }) => {
      if (!this.destroyed) {
        this.createEditor(EasyMDE);
      }
    }).catch(error => console.error('Could not load the markdown editor', error));
  }

  ngOnDestroy() {
    this.destroyed = true;
    try {
      if (this.easyMDE?.isFullscreenActive()) {
        this.easyMDE.toggleFullScreen();
      }
      this.easyMDE?.cleanup();
    } finally {
      this.clearFullscreenLayout();
      this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
      this.stateChanges.complete();
    }
  }

  protected loadEditor() {
    return import('easymde');
  }

  private createEditor(EasyMDE: any) {
    const textarea = this.textarea.nativeElement;
    const hadFocus = document.activeElement === textarea;
    const cursor = textarea.selectionStart;
    textarea.value = this.textValue ?? '';
    this.ngZone.runOutsideAngular(() => {
      this.easyMDE = new EasyMDE({ ...this.options, element: textarea, autofocus: hadFocus });
      const codemirror = this.easyMDE.codemirror;
      if (hadFocus) {
        codemirror.setCursor(codemirror.posFromIndex(cursor));
      }
      codemirror.on('change', () => {
        const text = this.easyMDE.value();
        if (text !== this.textValue) {
          this.ngZone.run(() => this.writeValue(text));
        }
      });
    });
  }

  private renderPreview(text: string) {
    return this.markdownRenderer.render(normalizeMarkdownWhitespace(text), `${environment.couchAddress}/`)
      .replace(/<a /g, '<a target="_blank" ');
  }

  private setFullscreenLayout(isFullscreen: boolean) {
    this.clearFullscreenLayout();
    if (!isFullscreen) {
      return;
    }

    const layout = this.findFullscreenLayout();
    if (!layout) {
      return;
    }

    this.fullscreenState = layout;
    const host = this.elementRef.nativeElement as HTMLElement;
    layout.formField = host.closest<HTMLElement>('.mat-mdc-form-field') ?? undefined;
    host.classList.add('planet-markdown-fullscreen-host');
    layout.formField?.classList.add('planet-markdown-fullscreen-field');
    layout.owner.classList.add('planet-markdown-fullscreen-owner');
    layout.actions.classList.add('planet-markdown-fullscreen-actions');

    this.updateFullscreenLayout();
    this.ngZone.runOutsideAngular(() => {
      layout.layoutObserver = new ResizeObserver(() => this.updateFullscreenLayout());
      layout.layoutObserver.observe(layout.actions);
    });
  }

  private holdDialogOpen(isFullscreen: boolean) {
    if (!this.dialogRef) {
      return;
    }
    if (isFullscreen) {
      this.dialogDisableClose = this.dialogRef.disableClose;
      this.dialogRef.disableClose = true;
      return;
    }
    // A microtask would restore it before the leaving Escape reaches the dialog's listener on body.
    const disableClose = this.dialogDisableClose;
    setTimeout(() => {
      this.dialogRef.disableClose = disableClose;
    });
  }

  private findFullscreenLayout(): FullscreenState | undefined {
    const host = this.elementRef.nativeElement as HTMLElement;
    let owner = host.parentElement;
    while (owner && owner !== document.body) {
      const actions = this.findVisibleActions(owner);
      if (actions) {
        return { owner, actions };
      }
      owner = owner.parentElement;
    }
    return undefined;
  }

  private findVisibleActions(owner: HTMLElement): HTMLElement | undefined {
    return Array.from(owner.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .find(element =>
        element.matches(PlanetMarkdownTextboxComponent.actionSelector) &&
        element.getClientRects().length > 0
      );
  }

  private updateFullscreenLayout() {
    const state = this.fullscreenState;
    if (!state) {
      return;
    }
    const actionsHeight = Math.ceil(state.actions.getBoundingClientRect().height);
    state.owner.style.setProperty('--fullscreen-actions-height', `${actionsHeight}px`);
  }

  private clearFullscreenLayout() {
    const state = this.fullscreenState;
    if (!state) {
      return;
    }
    state.layoutObserver?.disconnect();
    state.owner.classList.remove('planet-markdown-fullscreen-owner');
    state.owner.style.removeProperty('--fullscreen-actions-height');
    state.actions.classList.remove('planet-markdown-fullscreen-actions');
    state.formField?.classList.remove('planet-markdown-fullscreen-field');
    (this.elementRef.nativeElement as HTMLElement).classList.remove('planet-markdown-fullscreen-host');
    this.fullscreenState = undefined;
  }

  writeValue(val: string) {
    this.value = typeof this._value === 'string' || this.imageGroup === undefined ? val : { ...this._value, text: val || '' };
    this.setErrorState();
  }

  onChange(_: any) {}

  registerOnChange(fn: (_: any) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  onContainerClick(event: MouseEvent) {
    // EasyMDE handles clicks inside itself, and CodeMirror stays editable under its preview.
    if (!(event.target as Element).closest('.EasyMDEContainer')) {
      (this.easyMDE?.codemirror ?? this.textarea.nativeElement).focus();
    }
  }

  setErrorState() {
    this.errorState = this.ngControl.touched && (typeof this._value === 'string' ? this._value : this._value.text) === '';
  }

  onFocusOut() {
    this.ngControl.control.markAsTouched({ onlySelf: true });
    this.setErrorState();
  }

  checkHighlight() {
    if (this.ngControl.touched && this.ngControl.valid !== true) {
      this.errorState = true;
      this.value = typeof this.value === 'string' ? '' : { text: '', images: [] };
    } else {
      this.errorState = false;
    }
  }

  addImage() {
    this.dialog.open(MarkdownImagesDialogComponent, {
      width: '500px',
      data: {
        imageGroup: this.imageGroup
      }
    }).afterClosed().subscribe(image => {
      if (image) {
        const markdown = `![](resources/${image._id}/${encodeURI(image.filename)})`;
        this.easyMDE.options.insertTexts.image = [ markdown, '' ];
        this.ngZone.runOutsideAngular(() => this.easyMDE.drawImage());
        this.value = {
          ...this._value as ValueWithImages,
          images: [ ...(this._value as ValueWithImages).images, { resourceId: image._id, filename: image.filename, markdown } ]
        };
      }
    });
  }

}
