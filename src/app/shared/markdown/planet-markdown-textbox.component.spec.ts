import { vi } from 'vitest';
import { Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanetMarkdownTextboxComponent } from './planet-markdown-textbox.component';

describe('PlanetMarkdownTextboxComponent fullscreen layout', () => {
  let component: PlanetMarkdownTextboxComponent | undefined;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    component?.ngOnDestroy();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  const setupComponent = (markup: string, dialogRef?: { disableClose: boolean }) => {
    document.body.innerHTML = markup;
    document.querySelectorAll<HTMLElement>(
      '.mat-mdc-dialog-actions, .actions-container, .exam-buttons, .action-buttons, div.action-button'
    ).forEach(element => vi.spyOn(element, 'getClientRects').mockReturnValue(
      [ {} as DOMRect ] as unknown as DOMRectList
    ));

    const host = document.querySelector<HTMLElement>('planet-markdown-textbox');
    return new PlanetMarkdownTextboxComponent(
      null,
      {
        monitor: vi.fn().mockReturnValue(of(null)),
        stopMonitoring: vi.fn()
      } as any,
      new ElementRef(host),
      {} as any,
      { runOutsideAngular: (callback: () => void) => callback() } as any,
      {} as any,
      dialogRef as any
    );
  };

  it('pins the owning action row without selecting nested controls', () => {
    component = setupComponent(`
      <form>
        <div class="exam-buttons"></div>
        <mat-accordion>
          <planet-markdown-textbox></planet-markdown-textbox>
        </mat-accordion>
        <planet-step-list>
          <div class="action-buttons"></div>
        </planet-step-list>
      </form>
    `);
    const examActions = document.querySelector<HTMLElement>('.exam-buttons');
    const stepActions = document.querySelector<HTMLElement>('.action-buttons');

    component.options.onToggleFullScreen(true);

    expect(examActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(true);
    expect(stepActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(false);
  });

  it('finds dialog actions through Material wrapper elements', () => {
    component = setupComponent(`
      <mat-dialog-container class="mat-mdc-dialog-container">
        <div class="mat-mdc-dialog-inner-container">
          <div class="mat-mdc-dialog-surface">
            <form>
              <mat-dialog-content>
                <planet-markdown-textbox></planet-markdown-textbox>
              </mat-dialog-content>
              <mat-dialog-actions class="mat-mdc-dialog-actions"></mat-dialog-actions>
            </form>
          </div>
        </div>
      </mat-dialog-container>
    `);
    const dialogActions = document.querySelector<HTMLElement>('.mat-mdc-dialog-actions');

    component.options.onToggleFullScreen(true);

    expect(dialogActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(true);
  });

  it('restores the marked elements when fullscreen ends', () => {
    component = setupComponent(`
      <form>
        <div class="mat-mdc-form-field">
          <planet-markdown-textbox></planet-markdown-textbox>
        </div>
        <div class="action-buttons"></div>
      </form>
    `);
    const owner = document.querySelector<HTMLElement>('form');
    const formField = document.querySelector<HTMLElement>('.mat-mdc-form-field');
    const actions = document.querySelector<HTMLElement>('.action-buttons');
    const host = document.querySelector<HTMLElement>('planet-markdown-textbox');

    component.options.onToggleFullScreen(true);
    expect(formField.classList.contains('planet-markdown-fullscreen-field')).toBe(true);

    component.options.onToggleFullScreen(false);

    expect(owner.classList.contains('planet-markdown-fullscreen-owner')).toBe(false);
    expect(owner.style.getPropertyValue('--fullscreen-actions-height')).toBe('');
    expect(formField.classList.contains('planet-markdown-fullscreen-field')).toBe(false);
    expect(actions.classList.contains('planet-markdown-fullscreen-actions')).toBe(false);
    expect(host.classList.contains('planet-markdown-fullscreen-host')).toBe(false);
  });

  it.each([ false, true ])('holds its dialog open in fullscreen and restores disableClose %s once Escape passes', async disableClose => {
    const dialogRef = { disableClose };
    component = setupComponent('<planet-markdown-textbox></planet-markdown-textbox>', dialogRef);

    component.options.onToggleFullScreen(true);
    expect(dialogRef.disableClose).toBe(true);

    component.options.onToggleFullScreen(false);
    await Promise.resolve();
    expect(dialogRef.disableClose).toBe(true);
    await new Promise(resolve => setTimeout(resolve));
    expect(dialogRef.disableClose).toBe(disableClose);
  });
});

class FakeEasyMDE {
  static instance?: FakeEasyMDE;
  text: string;
  cleanup = vi.fn();
  toggleFullScreen = vi.fn();
  isFullscreenActive = vi.fn(() => false);
  changeHandler: () => void;
  codemirror = {
    on: (_event: string, handler: () => void) => {
      this.changeHandler = handler;
    },
    posFromIndex: (index: number) => index,
    setCursor: vi.fn(),
    focus: vi.fn()
  };

  constructor(public options: any) {
    this.text = options.element.value;
    FakeEasyMDE.instance = this;
  }

  value(text?: string) {
    if (text === undefined) {
      return this.text;
    }
    this.type(text);
  }

  type(text: string) {
    this.text = text;
    this.changeHandler();
  }
}

@Component({
  template: '<planet-markdown-textbox [formControl]="control" imageGroup="community"></planet-markdown-textbox>',
  imports: [ ReactiveFormsModule, PlanetMarkdownTextboxComponent ]
})
class FormControlHostComponent {
  control = new FormControl<any>('saved text');
}

@Component({
  template: '<planet-markdown-textbox [(ngModel)]="comment"></planet-markdown-textbox>',
  imports: [ FormsModule, PlanetMarkdownTextboxComponent ]
})
class NgModelHostComponent {
  comment = 'saved comment';
}

describe('PlanetMarkdownTextboxComponent editor', () => {
  const settle = async (fixture: ComponentFixture<unknown>) => {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
  };
  const typeInTextarea = (fixture: ComponentFixture<unknown>, text: string) => {
    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
  };
  const stubEditor = (editor: Promise<any> = Promise.resolve({ default: FakeEasyMDE })) =>
    vi.spyOn(PlanetMarkdownTextboxComponent.prototype as any, 'loadEditor').mockReturnValue(editor);
  const delayedEditor = () => {
    let arrive: () => void;
    stubEditor(new Promise(resolve => {
      arrive = () => resolve({ default: FakeEasyMDE });
    }));
    return () => arrive();
  };

  beforeEach(() => {
    FakeEasyMDE.instance = undefined;
    TestBed.configureTestingModule({ providers: [ { provide: MatDialog, useValue: {} } ] });
  });

  afterEach(() => vi.restoreAllMocks());

  it('gives the form its text and images value, and the editor the saved text, without any typing', async () => {
    stubEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    expect(fixture.componentInstance.control.value).toEqual({ text: 'saved text', images: [] });
    expect(FakeEasyMDE.instance.value()).toBe('saved text');
  });

  it('keeps a template-driven value', async () => {
    stubEditor();
    const fixture = TestBed.createComponent(NgModelHostComponent);
    await settle(fixture);

    expect(fixture.componentInstance.comment).toBe('saved comment');
    expect(FakeEasyMDE.instance.value()).toBe('saved comment');
  });

  it('sends typed text to the form and form writes to the editor', async () => {
    stubEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    FakeEasyMDE.instance.type('typed');
    expect(fixture.componentInstance.control.value).toEqual({ text: 'typed', images: [] });

    fixture.componentInstance.control.setValue('from the form');
    expect(FakeEasyMDE.instance.value()).toBe('from the form');
  });

  it('keeps text typed before the editor arrives', async () => {
    const editorArrives = delayedEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    typeInTextarea(fixture, 'typed early');
    editorArrives();
    await settle(fixture);

    expect(FakeEasyMDE.instance.value()).toBe('typed early');
    expect(fixture.componentInstance.control.value).toEqual({ text: 'typed early', images: [] });
    expect(FakeEasyMDE.instance.options.autofocus).toBe(false);
    expect(FakeEasyMDE.instance.codemirror.setCursor).not.toHaveBeenCalled();
  });

  it('moves focus and the caret into the editor when the textarea had focus', async () => {
    const editorArrives = delayedEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    typeInTextarea(fixture, 'first\nsecond');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.focus();
    textarea.setSelectionRange(8, 8);
    editorArrives();
    await settle(fixture);

    expect(FakeEasyMDE.instance.options.autofocus).toBe(true);
    expect(FakeEasyMDE.instance.codemirror.setCursor).toHaveBeenCalledWith(8);
  });

  it('stays editable when the editor cannot load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubEditor(Promise.reject(new Error('chunk failed')));
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    typeInTextarea(fixture, 'typed without the editor');

    expect(fixture.componentInstance.control.value).toEqual({ text: 'typed without the editor', images: [] });
    expect(consoleError).toHaveBeenCalled();
  });

  it('does not create an editor once destroyed, and releases one it created', async () => {
    const editorArrives = delayedEditor();
    const destroyedEarly = TestBed.createComponent(FormControlHostComponent);
    await settle(destroyedEarly);
    destroyedEarly.destroy();
    editorArrives();
    await new Promise(resolve => setTimeout(resolve));
    expect(FakeEasyMDE.instance).toBeUndefined();

    stubEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);
    const editor = FakeEasyMDE.instance;
    editor.isFullscreenActive.mockReturnValue(true);
    fixture.destroy();

    expect(editor.toggleFullScreen).toHaveBeenCalled();
    expect(editor.cleanup).toHaveBeenCalled();
  });

  it('focuses the editor from a click on its form field, but leaves clicks inside the editor alone', async () => {
    stubEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);
    const textbox: PlanetMarkdownTextboxComponent = fixture.debugElement.query(By.css('planet-markdown-textbox')).componentInstance;
    const editor = document.createElement('div');
    editor.innerHTML = '<div class="EasyMDEContainer"><div class="editor-preview"></div></div>';

    textbox.onContainerClick({ target: editor.querySelector('.editor-preview') } as unknown as MouseEvent);
    expect(FakeEasyMDE.instance.codemirror.focus).not.toHaveBeenCalled();

    textbox.onContainerClick({ target: fixture.nativeElement } as unknown as MouseEvent);
    expect(FakeEasyMDE.instance.codemirror.focus).toHaveBeenCalled();
  });

  it('previews through the shared renderer', async () => {
    stubEditor();
    const fixture = TestBed.createComponent(FormControlHostComponent);
    await settle(fixture);

    const preview = new DOMParser().parseFromString(FakeEasyMDE.instance.options.previewRender(
      '<img src="x" onerror="alert(1)">\n\n![pic](resources/id/pic.png)\n\n[site](https://example.com) [script](javascript:alert(1))'
    ), 'text/html').body;

    expect(preview.querySelector('[onerror]')).toBeNull();
    expect(preview.querySelector('img[alt="pic"]').getAttribute('src')).toBe(`${environment.couchAddress}/resources/id/pic.png`);
    expect(preview.querySelector('a').getAttribute('target')).toBe('_blank');
    expect(preview.querySelector('a[href^="javascript"]')).toBeNull();
  });
});
