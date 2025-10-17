import { ManagerDashboardComponent } from './manager-dashboard.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { of, throwError } from 'rxjs';

describe('ManagerDashboardComponent', () => {
  let component: ManagerDashboardComponent;
  let couchService: any;
  let managerService: any;
  let planetMessageService: any;
  let dialog: any;
  let dialogRef: any;

  beforeEach(() => {
    couchService = jasmine.createSpyObj('CouchService', [ 'get', 'put' ]);
    managerService = jasmine.createSpyObj('ManagerService', [ 'createPin' ]);
    planetMessageService = jasmine.createSpyObj('PlanetMessageService', [ 'showMessage', 'showAlert' ]);
    dialogRef = jasmine.createSpyObj('MatDialogRef', [ 'close', 'afterClosed' ]);
    dialogRef.afterClosed.and.returnValue(of(true));
    dialog = jasmine.createSpyObj('MatDialog', [ 'open' ]);
    dialog.open.and.returnValue(dialogRef);

    const userService = {
      get: jasmine.createSpy('get').and.returnValue({
        isUserAdmin: false,
        _id: 'user-id',
        _rev: 'user-rev',
        name: 'user-name'
      }),
      shelf: { _rev: 'shelf-rev' }
    };

    const stateService = {
      configuration: {
        planetType: 'community',
        _id: 'planet-id',
        _rev: 'planet-rev',
        name: 'Planet Name',
        parentDomain: 'parent.domain',
        streaming: false,
        code: 'planet-code'
      }
    };

    const coursesService = { attachedItemsOfCourses: () => ({ resources: [], exams: [] }) };
    const router = { navigate: jasmine.createSpy('navigate') };
    const dialogsListService = { getListAndColumns: () => of({ tableData: [] }) };
    const configurationService = { updateConfiguration: () => of({}) };
    const deviceInfoService = {};

    managerService.createPin.and.returnValue('4321');
    couchService.get.and.returnValue(of({
      _id: 'org.couchdb.user:satellite',
      _rev: '1',
      derived_key: 'derived',
      iterations: 10,
      password_scheme: 'pbkdf2',
      salt: 'salt-value'
    }));
    couchService.put.and.returnValue(of({}));

    component = new ManagerDashboardComponent(
      userService as any,
      couchService as any,
      coursesService as any,
      router as any,
      planetMessageService as any,
      dialogsListService as any,
      dialog as any,
      configurationService as any,
      stateService as any,
      managerService as any,
      deviceInfoService as any
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open a confirmation dialog before resetting the pin', () => {
    component.confirmResetPin();

    expect(dialog.open).toHaveBeenCalledWith(DialogsPromptComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({
        showMainParagraph: false,
        extraMessage: jasmine.stringMatching('Resetting the PIN'),
        okClick: jasmine.objectContaining({ request: jasmine.any(Object) })
      })
    }));
    expect(managerService.createPin).not.toHaveBeenCalled();
  });

  it('should reset the pin and notify on confirmation', () => {
    spyOn(component, 'getSatellitePin');
    component.confirmResetPin();

    const dialogArgs = dialog.open.calls.mostRecent().args[1];
    const okClick = dialogArgs.data.okClick;

    okClick.request.subscribe(okClick.onNext, okClick.onError);

    expect(managerService.createPin).toHaveBeenCalled();
    expect(couchService.put).toHaveBeenCalledWith('_users/org.couchdb.user:satellite', jasmine.objectContaining({ password: '4321' }));
    expect(couchService.put).toHaveBeenCalledWith('_node/nonode@nohost/_config/satellite/pin', '4321');
    expect(component.getSatellitePin).toHaveBeenCalled();
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('Pin reset successfully');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should show an error message if the pin reset fails', () => {
    couchService.put.and.callFake((url: string) => {
      if (url.includes('_config')) {
        return throwError(() => new Error('failure'));
      }
      return of({});
    });

    component.confirmResetPin();

    const dialogArgs = dialog.open.calls.mostRecent().args[1];
    const okClick = dialogArgs.data.okClick;

    okClick.request.subscribe(okClick.onNext, okClick.onError);

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('Error to reset pin');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
