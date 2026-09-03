import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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
              achievements: [],
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

  it('prompts confirmation when removeExistingResume is called and deletes upon confirmation', () => {
    component.currentResumeFileName = 'resume.pdf';
    component.removeExistingResume();

    expect(dialogMock.open).toHaveBeenCalled();
    const dialogConfig = dialogMock.open.mock.calls[0][1];
    expect(dialogConfig.data.displayName).toBe('resume.pdf');

    dialogConfig.data.okClick.onNext();
    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(component.resumeMarkedForDeletion).toBe(true);
    expect(component.currentResumeFileName).toBe('');
  });
});
