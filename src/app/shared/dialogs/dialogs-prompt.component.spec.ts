import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogsPromptComponent } from './dialogs-prompt.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DialogsPromptComponent', () => {
  let component: DialogsPromptComponent;
  let fixture: ComponentFixture<DialogsPromptComponent>;
  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockData = {
    extraMessage: 'Initial extra message',
    showMainParagraph: true,
    cancelable: true,
    spinnerOn: true,
    showLabels: [],
    isDateUtc: false
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        DialogsPromptComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogsPromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have access to data.extraMessage', () => {
    expect(component.data.extraMessage).toBe('Initial extra message');
  });

  it('should sanitize extraMessage', () => {
    const maliciousExtraMessage = 'Safe text <script>alert("xss")</script>';
    const testData = { ...mockData, extraMessage: maliciousExtraMessage };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ DialogsPromptComponent, NoopAnimationsModule ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: testData }
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(DialogsPromptComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.extraMessage).not.toContain('<script>');
    expect(newComponent.extraMessage).toContain('Safe text');
  });
});
