import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsersAchievementsUpdateComponent } from './users-achievements-update.component';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { UsersAchievementsService } from './users-achievements.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetMarkdownTextboxComponent } from '../../shared/forms/planet-markdown-textbox.component';
import { PlanetStepListComponent } from '../../shared/forms/planet-step-list.component';

describe('UsersAchievementsUpdateComponent', () => {
  let component: UsersAchievementsUpdateComponent;
  let fixture: ComponentFixture<UsersAchievementsUpdateComponent>;
  let dialogMock: any;
  let dialogRefMock: any;

  beforeEach(waitForAsync(() => {
    dialogRefMock = { close: vi.fn() };
    dialogMock = { open: vi.fn().mockImplementation(() => dialogRefMock), openDialogs: [] };

    TestBed.configureTestingModule({
      imports: [
        FormsModule, ReactiveFormsModule, RouterTestingModule, BrowserAnimationsModule,
        MatIconTestingModule, UsersAchievementsUpdateComponent
      ],
      providers: [
        provideNativeDateAdapter(),
        { provide: MatDialog, useValue: dialogMock },
        { provide: CouchService, useValue: { get: vi.fn().mockReturnValue(of({})) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              queryParams: {},
              paramMap: { get: () => 'testuser' }
            }
          }
        },
        {
          provide: UserService,
          useValue: {
            minBirthDate: new Date(1900, 0, 1),
            get: vi.fn().mockReturnValue({ _id: 'user1', name: 'testuser' })
          }
        },
        {
          provide: UsersAchievementsService,
          useValue: {
            getAchievements: vi.fn().mockReturnValue(of({
              _id: 'achievements:user1',
              _rev: '1-abc',
              purpose: '',
              goals: '',
              dateSortOrder: 'asc',
              achievements: [
                { title: 'First Achievement', description: '', link: '', date: '2024-01-01' },
                { title: 'Second Achievement', description: '', link: '', date: '2024-02-01' }
              ],
              references: [],
              links: []
            }))
          }
        },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: DialogsFormService, useValue: { openDialogsForm: vi.fn() } },
        { provide: StateService, useValue: { configuration: {} } },
        { provide: ValidatorService, useValue: { notDateInFuture$: vi.fn().mockReturnValue(of(null)) } }
      ]
    }).overrideComponent(PlanetMarkdownTextboxComponent, {
      set: { template: '<div></div>', imports: [] }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersAchievementsUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('configures deletion confirmation for achievements, references, and links', () => {
    const stepLists = fixture.debugElement.queryAll(By.directive(PlanetStepListComponent))
      .map(element => element.componentInstance as PlanetStepListComponent);

    expect(stepLists).toHaveLength(3);
    expect(stepLists.map(list => list.confirmDelete)).toEqual([ true, true, true ]);
    expect(stepLists.map(list => list.defaultName)).toEqual([ 'Achievement', 'Reference', 'Link' ]);
  });

  it('keeps the date sort when achievement deletion is canceled', () => {
    const achievementList = fixture.debugElement.query(By.directive(PlanetStepListComponent))
      .componentInstance as PlanetStepListComponent;

    expect(component.hasUnsavedChanges).toBe(false);

    achievementList.moveStep({ index: 0, direction: 0, listId: achievementList.listId });
    dialogRefMock.close();

    expect(component.editForm.controls.dateSortOrder.value).toBe('asc');
    expect(component.achievements).toHaveLength(2);
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('resets the date sort after achievement deletion is confirmed', () => {
    const achievementList = fixture.debugElement.query(By.directive(PlanetStepListComponent))
      .componentInstance as PlanetStepListComponent;

    achievementList.moveStep({ index: 0, direction: 0, listId: achievementList.listId });
    const dialogConfig = dialogMock.open.mock.calls[0][1];
    dialogConfig.data.okClick.onNext();

    expect(component.editForm.controls.dateSortOrder.value).toBe('none');
    expect(component.achievements).toHaveLength(1);
  });

  it('leaves resume state unchanged when removal is canceled', () => {
    const pendingResume = { name: 'replacement.pdf' } as File;
    component.currentResumeFileName = 'resume.pdf';
    component.resumeFile = pendingResume;

    component.removeExistingResume();
    dialogRefMock.close();

    expect(component.currentResumeFileName).toBe('resume.pdf');
    expect(component.resumeMarkedForDeletion).toBe(false);
    expect(component.resumeFile).toBe(pendingResume);
  });

  it('removes the existing resume after confirmation and preserves a pending replacement', () => {
    const pendingResume = { name: 'replacement.pdf' } as File;
    component.currentResumeFileName = 'resume.pdf';
    component.resumeFile = pendingResume;
    component.removeExistingResume();

    expect(dialogMock.open).toHaveBeenCalled();
    const dialogConfig = dialogMock.open.mock.calls[0][1];
    expect(dialogConfig.data.displayName).toBe('resume.pdf');
    expect(dialogConfig.data.spinnerOn).toBe(false);

    dialogConfig.data.okClick.onNext();
    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(component.resumeMarkedForDeletion).toBe(true);
    expect(component.currentResumeFileName).toBe('');
    expect(component.resumeFile).toBe(pendingResume);
  });
});
