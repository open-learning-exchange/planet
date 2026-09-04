import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { DialogsPromptComponent } from './dialogs-prompt.component';

describe('DialogsPromptComponent', () => {
  let fixture: ComponentFixture<DialogsPromptComponent>;
  const dialogRef = { close: vi.fn() };

  const createComponent = (data: any) => {
    TestBed.configureTestingModule({
      imports: [ DialogsPromptComponent ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    fixture = TestBed.createComponent(DialogsPromptComponent);
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('.km-extra-message'));
  };

  afterEach(() => {
    dialogRef.close.mockClear();
    TestBed.resetTestingModule();
  });

  it('does not render an extra message paragraph when no extra message is given', () => {
    expect(createComponent({ changeType: 'delete', type: 'resource' })).toBeNull();
  });

  it('keeps a primary extra message in body styling by default', () => {
    const extraMessage = createComponent({
      showMainParagraph: false,
      extraMessage: 'Are you sure you want to delete the following step?'
    });

    expect(extraMessage.nativeElement.textContent).toBe('Are you sure you want to delete the following step?');
    expect(extraMessage.nativeElement.classList).not.toContain('extra-message-supplementary');
  });

  it('keeps an explicitly primary extra message in body styling', () => {
    const extraMessage = createComponent({
      showMainParagraph: false,
      extraMessage: 'The value(s) of the following are not in the normal range.',
      extraMessageType: 'body'
    });

    expect(extraMessage.nativeElement.classList).not.toContain('extra-message-supplementary');
  });

  it('demotes a supplementary extra message below the primary message', () => {
    const extraMessage = createComponent({
      changeType: 'exit',
      type: 'exam',
      extraMessage: 'Your progress will be saved.',
      extraMessageType: 'supplementary'
    });

    expect(extraMessage.nativeElement.classList).toContain('extra-message-supplementary');
    expect(extraMessage.nativeElement.textContent).toBe('Your progress will be saved.');
  });

  it('preserves HTML markup within a supplementary extra message', () => {
    const extraMessage = createComponent({
      showMainParagraph: false,
      extraMessage: 'Click <b>Cancel</b> to fix or click <b>OK</b> to submit.',
      extraMessageType: 'supplementary'
    });

    expect(extraMessage.query(By.css('b'))).not.toBeNull();
    expect(extraMessage.nativeElement.textContent).toBe('Click Cancel to fix or click OK to submit.');
  });
});
