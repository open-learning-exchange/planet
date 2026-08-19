import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsersTableComponent } from './users-table.component';
import { UserService } from '../shared/user.service';
import { UsersService } from './users.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

describe('UsersTableComponent', () => {
  let component: UsersTableComponent;
  let fixture: ComponentFixture<UsersTableComponent>;
  let dialog: MatDialog;
  let userService: UserService;
  let usersService: UsersService;
  let planetMessageService: PlanetMessageService;
  const mockUser = { _id: 'org.couchdb.user:johndoe', name: 'johndoe', planetCode: 'planet', roles: [ 'learner' ] };

  const openDeactivateDialog = () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    let dialogData: any;
    const dialogOpenSpy = vi.spyOn(dialog, 'open').mockImplementation((_, config) => {
      dialogData = config?.data;
      return { close: vi.fn() } as any;
    });

    component.deactivateClick(mockUser, event);

    return { dialogData, event, dialogOpenSpy };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        BrowserAnimationsModule,
        UsersTableComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    dialog = TestBed.inject(MatDialog);
    userService = TestBed.inject(UserService);
    usersService = TestBed.inject(UsersService);
    planetMessageService = TestBed.inject(PlanetMessageService);

    vi.spyOn(userService, 'get').mockReturnValue({ isUserAdmin: true, name: 'admin' } as any);
    vi.spyOn(usersService, 'requestUsers').mockImplementation(() => {});
    vi.spyOn(planetMessageService, 'showMessage').mockImplementation(() => {});
    vi.spyOn(planetMessageService, 'showAlert').mockImplementation(() => {});

    fixture = TestBed.createComponent(UsersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create UsersTableComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should open DialogsPromptComponent with deactivate configuration when deactivateClick is called', () => {
    const { event, dialogOpenSpy } = openDeactivateDialog();

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(dialogOpenSpy).toHaveBeenCalledWith(DialogsPromptComponent, {
      data: expect.objectContaining({
        amount: 'single',
        changeType: 'deactivate',
        type: 'user',
        displayName: 'johndoe'
      })
    });
  });

  it('should not call setRoles while the deactivation is unconfirmed', () => {
    const setRolesSpy = vi.spyOn(usersService, 'setRoles').mockReturnValue(of({ ok: true } as any));

    openDeactivateDialog();

    expect(setRolesSpy).not.toHaveBeenCalled();
  });

  it('should call setRoles with empty array when deactivation is confirmed', () => {
    const setRolesSpy = vi.spyOn(usersService, 'setRoles').mockReturnValue(of({ ok: true } as any));
    const { dialogData } = openDeactivateDialog();

    dialogData.okClick.request.subscribe(dialogData.okClick.onNext);

    expect(setRolesSpy).toHaveBeenCalledWith(mockUser, []);
    expect(usersService.requestUsers).toHaveBeenCalledWith(true);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('User deactivated: johndoe');
  });

  it('should alert without refreshing users when the deactivation request fails', () => {
    vi.spyOn(usersService, 'setRoles').mockImplementation(() => {
      throw new Error('offline');
    });
    const { dialogData } = openDeactivateDialog();

    dialogData.okClick.request.subscribe({ error: dialogData.okClick.onError });

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was an error deactivating user.');
    expect(usersService.requestUsers).not.toHaveBeenCalled();
    expect(planetMessageService.showMessage).not.toHaveBeenCalled();
  });
});
