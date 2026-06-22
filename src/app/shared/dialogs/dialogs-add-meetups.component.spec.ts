import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EMPTY } from 'rxjs';
import { vi } from 'vitest';

import { DialogsAddMeetupsComponent } from './dialogs-add-meetups.component';
import { DialogsLoadingService } from './dialogs-loading.service';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'planet-meetups-add',
  template: ''
})
class MeetupsAddStubComponent {
  @Input() isDialog = false;
  @Input() link: any = {};
  @Input() meetup: any = {};
  @Input() sync: any;
  @Output() goBackEvent = new EventEmitter<any>();

  hasUnsavedChanges = false;

  canDeactivate(): boolean {
    return true;
  }
}

@Component({
  selector: 'planet-meetups-view',
  template: ''
})
class MeetupsViewStubComponent {
  @Input() isDialog = false;
  @Input() meetupDetail: any = {};
  @Input() editable = true;
  @Output() switchView = new EventEmitter<any>();
}

describe('DialogsAddMeetupsComponent', () => {
  let fixture: ComponentFixture<DialogsAddMeetupsComponent>;
  let data: any;
  let dialogRef: any;
  let dialogsLoadingService: any;

  beforeEach(() => {
    data = {
      onMeetupsChange: vi.fn()
    };
    dialogRef = {
      disableClose: false,
      backdropClick: () => EMPTY,
      close: vi.fn()
    };
    dialogsLoadingService = {
      stop: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [DialogsAddMeetupsComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: {} },
        { provide: DialogsLoadingService, useValue: dialogsLoadingService }
      ]
    });
    TestBed.overrideComponent(DialogsAddMeetupsComponent, {
      set: {
        imports: [MeetupsAddStubComponent, MeetupsViewStubComponent],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }
    });
    fixture = TestBed.createComponent(DialogsAddMeetupsComponent);
    fixture.detectChanges();
  });

  it('closes and refreshes meetups when the add form emits goBackEvent', () => {
    const meetupsAdd = fixture.debugElement.query(By.directive(MeetupsAddStubComponent)).componentInstance as MeetupsAddStubComponent;

    meetupsAdd.goBackEvent.emit({ ok: true });
    fixture.detectChanges();

    expect(data.onMeetupsChange).toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
