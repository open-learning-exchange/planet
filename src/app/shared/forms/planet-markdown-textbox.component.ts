import {
  Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, OnInit, ViewEncapsulation, ElementRef, DoCheck, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';
import { DialogsImagesComponent } from '../dialogs/dialogs-images.component';

interface ImageInfo { resourceId: string; filename: string; markdown: string; }
interface ValueWithImages { text: string; images: ImageInfo[]; }

@Component({
  'selector': 'planet-markdown-textbox',
  'templateUrl': './planet-markdown-textbox.component.html',
  'styleUrls': [ 'planet-markdown-textbox.scss' ],
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetMarkdownTextboxComponent },
  ],
  'encapsulation': ViewEncapsulation.None
})
export class PlanetMarkdownTextboxComponent implements ControlValueAccessor, DoCheck, OnInit, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-markdown-textbox-${PlanetMarkdownTextboxComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  @ViewChild('editor') editor;
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
  private _textValue: string;
  get textValue(): string {
    return this._textValue;
  }
  set textValue(newText: string) {
    this._textValue = newText;
    if (newText !== (typeof this._value === 'string' ? this._value : this._value.text)) {
      this.value = typeof this._value === 'string' ? newText : { ...this._value, text: newText };
    }
  }
  @Output() valueChanges = new EventEmitter<string[]>();

  get empty() {
    return (typeof this._value === 'string' ? this._value : this._value.text).length === 0;
  }

  private _placeholder: string;
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(text: string) {
    this._placeholder = text;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) {
    this._required = value;
    this.stateChanges.next();
  }
  private _required = false;

  get shouldLabelFloat() {
    return true;
  }

  @Input() imageGroup: 'community' | { [db: string]: string };
  onTouched;
  stateChanges = new Subject<void>();
  focused = false;
  errorState = false;
  options: any = { hideIcons: [ 'image' ] };

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private dialog: MatDialog
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
      action: this.addImage.bind(this),
      className: 'fa fa-picture-o',
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
              className: 'fa fa-header',
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
              title: $localize`Preview`
            },
            {
              name: 'side-by-side',
              action: (editor: any) => editor.toggleSideBySide(),
              className: 'fa fa-columns',
              title: $localize`Side by Side`
            },
            {
              name: 'fullscreen',
              action: (editor: any) => editor.toggleFullScreen(),
              className: 'fa fa-arrows-alt',
              title: $localize`Fullscreen`
            },
            '|',
            {
              name: 'guide',
              action: 'https://www.markdownguide.org/basic-syntax/',
              className: 'fa fa-question-circle',
              title: $localize`Markdown Guide`
            }
          ]
        } :
        {}
      )
    };
    this._value = this.imageGroup ? { text: '', images: [] } : '';
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  writeValue(val: string) {
    this.value = typeof this._value === 'string' || this.imageGroup === undefined ? val : { ...this._value, text: val };
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
    this.dialog.open(DialogsImagesComponent, {
      width: '500px',
      data: {
        imageGroup: this.imageGroup
      }
    }).afterClosed().subscribe(image => {
      if (image) {
        const markdown = `![](resources/${image._id}/${encodeURI(image.filename)})`;
        this.editor.options.insertTexts.image = [ markdown, '' ];
        this.editor.easyMDE.drawImage();
        this.value = {
          ...<ValueWithImages>this._value,
          images: [ ...(<ValueWithImages>this._value).images, { resourceId: image._id, filename: image.filename, markdown } ]
        };
      }
    });
  }

}
