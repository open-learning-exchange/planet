import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EMPTY, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';

import { MeetupsAddDialogComponent } from './meetups-add-dialog.component';

@Component({
  selector: 'planet-meetups-add',
  template: ''
})
class MeetupsAddStubComponent {
  @Input() isDialog = false;
  @Input() editable = true;
  @Input() leaderOfTeamId?: string;
  @Input() link: any = {};
  @Input() meetup: any = {};
  @Input() sync: any;
  @Output() goBackEvent = new EventEmitter<any>();

  hasUnsavedChanges = false;
  canDeactivateValue = true;

  canDeactivate(): boolean {
    return this.canDeactivateValue;
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
  @Input() leaderOfTeamId?: string;
  @Output() switchView = new EventEmitter<any>();
}

describe('MeetupsAddDialogComponent', () => {
  let component: MeetupsAddDialogComponent;
  let fixture: ComponentFixture<MeetupsAddDialogComponent>;
  let data: any;
  let dialogRef: any;
  let dialogsLoadingService: any;
  let keydown: Subject<KeyboardEvent>;
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    data = {
      onMeetupsChange: vi.fn(),
      leaderOfTeamId: 'team-1'
    };
    keydown = new Subject<KeyboardEvent>();
    dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    dialogRef = {
      disableClose: false,
      backdropClick: () => EMPTY,
      keydownEvents: () => keydown,
      close: vi.fn()
    };
    dialogsLoadingService = {
      stop: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [MeetupsAddDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: dialog },
        { provide: DialogsLoadingService, useValue: dialogsLoadingService }
      ]
    });
    TestBed.overrideComponent(MeetupsAddDialogComponent, {
      set: {
        imports: [MeetupsAddStubComponent, MeetupsViewStubComponent]
      }
    });
    fixture = TestBed.createComponent(MeetupsAddDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(dialogRef.disableClose).toBe(true);
  });

  it('uses provided dialog data', () => {
    expect(component.link).toEqual({});
    expect(component.meetup).toEqual({});
    expect(component.view).toBe('add');
    expect(component.editable).toBe(true);
    expect(component.leaderOfTeamId).toBe('team-1');
    const meetupsAdd = fixture.debugElement.query(By.directive(MeetupsAddStubComponent)).componentInstance;
    expect(meetupsAdd.leaderOfTeamId).toBe('team-1');
  });

  it('delegates canDeactivate to the add form', () => {
    const meetupsAdd = fixture.debugElement.query(By.directive(MeetupsAddStubComponent)).componentInstance as MeetupsAddStubComponent;

    meetupsAdd.canDeactivateValue = false;

    expect(component.canDeactivate()).toBe(false);
  });

  it('closes and refreshes meetups when the add form emits goBackEvent', () => {
    const meetupsAdd = fixture.debugElement.query(By.directive(MeetupsAddStubComponent)).componentInstance as MeetupsAddStubComponent;

    meetupsAdd.goBackEvent.emit({ ok: true });
    fixture.detectChanges();

    expect(data.onMeetupsChange).toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('switches to the view component', () => {
    component.switchView('view');
    fixture.detectChanges();

    expect(component.view).toBe('view');
    expect(fixture.debugElement.query(By.directive(MeetupsViewStubComponent))).toBeTruthy();
  });

  it('closes and refreshes meetups when switching to close', () => {
    component.switchView('close');

    expect(data.onMeetupsChange).toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('closes gracefully when onMeetupsChange is omitted in dialog data', () => {
    delete data.onMeetupsChange;

    expect(() => component.meetupsChange()).not.toThrow();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('asks on Escape when the add form has changes, then closes and refreshes meetups', () => {
    const meetupsAdd = fixture.debugElement.query(By.directive(MeetupsAddStubComponent)).componentInstance as MeetupsAddStubComponent;
    meetupsAdd.canDeactivateValue = false;

    keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(meetupsAdd.hasUnsavedChanges).toBe(false);
    expect(data.onMeetupsChange).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
