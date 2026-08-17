import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsersTableComponent } from './users-table.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { UsersService } from './users.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

describe('UsersTableComponent', () => {
  let component: UsersTableComponent;
  let fixture: ComponentFixture<UsersTableComponent>;
  let dialog: MatDialog;
  let userService: UserService;
  let usersService: UsersService;
  let planetMessageService: PlanetMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        BrowserAnimationsModule,
        UsersTableComponent
      ],
      providers: [
        CouchService,
        UserService,
        UsersService,
        StateService,
        PlanetMessageService,
        provideHttpClient(withInterceptorsFromDi())
      ]
    });

    dialog = TestBed.inject(MatDialog);
    userService = TestBed.inject(UserService);
    usersService = TestBed.inject(UsersService);
    planetMessageService = TestBed.inject(PlanetMessageService);

    vi.spyOn(userService, 'get').mockReturnValue({ isUserAdmin: true, name: 'admin' } as any);

    fixture = TestBed.createComponent(UsersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create UsersTableComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should open DialogsPromptComponent with deactivate configuration when deactivateClick is called', () => {
    const mockUser = { name: 'johndoe', roles: [ 'learner' ] };
    const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
    const dialogOpenSpy = vi.spyOn(dialog, 'open').mockReturnValue({
      close: vi.fn()
    } as any);

    component.deactivateClick(mockUser, mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(dialogOpenSpy).toHaveBeenCalledWith(DialogsPromptComponent, {
      data: expect.objectContaining({
        amount: 'single',
        changeType: 'deactivate',
        type: 'user',
        displayName: 'johndoe'
      })
    });
  });

  it('should call setRoles with empty array when deactivation is confirmed', () => {
    const mockUser = { name: 'johndoe', roles: [ 'learner' ] };
    const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
    vi.spyOn(usersService, 'setRoles').mockReturnValue(of({ ok: true } as any));
    const showMessageSpy = vi.spyOn(planetMessageService, 'showMessage');
    const requestUsersSpy = vi.spyOn(usersService, 'requestUsers');

    let dialogData: any;
    vi.spyOn(dialog, 'open').mockImplementation((_, config) => {
      dialogData = config?.data;
      return { close: vi.fn() } as any;
    });

    component.deactivateClick(mockUser, mockEvent);

    expect(dialogData).toBeDefined();
    dialogData.okClick.onNext();

    expect(requestUsersSpy).toHaveBeenCalledWith(true);
    expect(showMessageSpy).toHaveBeenCalledWith('User deactivated: johndoe');
  });
});
