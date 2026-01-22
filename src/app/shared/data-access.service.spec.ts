import { TestBed } from '@angular/core/testing';
import { DataAccessService } from './data-access.service';
import { UserService } from './user.service';
import { StateService } from './state.service';
import { CouchService } from './couchdb.service';
import { DialogsLoadingService } from './dialogs/dialogs-loading.service';
import { of, throwError, BehaviorSubject } from 'rxjs';

describe('DataAccessService', () => {
  let service: DataAccessService;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let stateServiceSpy: jasmine.SpyObj<StateService>;
  let couchServiceSpy: jasmine.SpyObj<CouchService>;
  let loadingServiceSpy: jasmine.SpyObj<DialogsLoadingService>;

  beforeEach(() => {
    const userSpy = jasmine.createSpyObj('UserService', ['get', 'updateShelf', 'changeShelf'], {
      shelf: { myTeamIds: [] },
      shelfChange$: new BehaviorSubject({})
    });
    const stateSpy = jasmine.createSpyObj('StateService', [], { configuration: { code: 'test', parentCode: 'testParent' } });
    const couchSpy = jasmine.createSpyObj('CouchService', ['get', 'put', 'delete']);
    const loadingSpy = jasmine.createSpyObj('DialogsLoadingService', ['start', 'stop']);

    TestBed.configureTestingModule({
      providers: [
        DataAccessService,
        { provide: UserService, useValue: userSpy },
        { provide: StateService, useValue: stateSpy },
        { provide: CouchService, useValue: couchSpy },
        { provide: DialogsLoadingService, useValue: loadingSpy }
      ]
    });

    service = TestBed.inject(DataAccessService);
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    stateServiceSpy = TestBed.inject(StateService) as jasmine.SpyObj<StateService>;
    couchServiceSpy = TestBed.inject(CouchService) as jasmine.SpyObj<CouchService>;
    loadingServiceSpy = TestBed.inject(DialogsLoadingService) as jasmine.SpyObj<DialogsLoadingService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get user data', () => {
    const mockUser = { name: 'test' };
    userServiceSpy.get.and.returnValue(mockUser);
    expect(service.getUserData()).toEqual(mockUser);
  });

  it('should get configuration', () => {
    expect(service.getConfiguration()).toEqual({ code: 'test', parentCode: 'testParent' });
  });

  describe('fetchShelfData', () => {
    it('should call couchService.get and handle loading', (done) => {
      couchServiceSpy.get.and.returnValue(of({ _id: 'shelf1' }));
      userServiceSpy.get.and.returnValue({ _id: 'user1' });

      service.fetchShelfData().subscribe(res => {
        expect(couchServiceSpy.get).toHaveBeenCalledWith('shelf/user1');
        expect(loadingServiceSpy.start).toHaveBeenCalled();
        expect(loadingServiceSpy.stop).toHaveBeenCalled();
        expect(res).toEqual({ _id: 'shelf1' });
        done();
      });
    });

    it('should handle error and stop loading', (done) => {
      couchServiceSpy.get.and.returnValue(throwError('error'));
      userServiceSpy.get.and.returnValue({ _id: 'user1' });

      service.fetchShelfData().subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error).toBe('error');
          expect(loadingServiceSpy.stop).toHaveBeenCalled();
          done();
        }
      );
    });
  });

  describe('saveShelfData', () => {
    it('should call userService.updateShelf and handle loading', (done) => {
      userServiceSpy.updateShelf.and.returnValue(of({ shelf: {}, countChanged: 1 }));

      service.saveShelfData(['1', '2'], 'myList').subscribe(res => {
        expect(userServiceSpy.updateShelf).toHaveBeenCalledWith(['1', '2'], 'myList');
        expect(loadingServiceSpy.start).toHaveBeenCalled();
        expect(loadingServiceSpy.stop).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('changeShelfData', () => {
    it('should call userService.changeShelf and handle loading', (done) => {
      userServiceSpy.changeShelf.and.returnValue(of({ shelf: {}, countChanged: 1 }));

      service.changeShelfData(['1'], 'myList', 'add').subscribe(res => {
        expect(userServiceSpy.changeShelf).toHaveBeenCalledWith(['1'], 'myList', 'add');
        expect(loadingServiceSpy.start).toHaveBeenCalled();
        expect(loadingServiceSpy.stop).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('deleteShelf', () => {
    it('should call couchService.delete and handle loading', (done) => {
      couchServiceSpy.delete.and.returnValue(of({ ok: true }));

      service.deleteShelf('user1', 'rev1').subscribe(res => {
        expect(couchServiceSpy.delete).toHaveBeenCalledWith('shelf/user1?rev=rev1');
        expect(loadingServiceSpy.start).toHaveBeenCalled();
        expect(loadingServiceSpy.stop).toHaveBeenCalled();
        done();
      });
    });
  });
});
