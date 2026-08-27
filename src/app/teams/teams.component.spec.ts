import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';

import { TeamsComponent } from './teams.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

describe('TeamsComponent', () => {
  const user = { _id: 'org.couchdb.user:sam', name: 'sam' };
  const localTeam = {
    _id: 'team_local', name: 'Local Team', type: 'team', status: 'active', teamType: 'local', teamPlanetCode: 'planet'
  };
  const enterprise = {
    _id: 'enterprise_one', name: 'Enterprise One', type: 'enterprise', status: 'active', teamType: 'sync', teamPlanetCode: 'planet'
  };

  let component: TeamsComponent;
  let fixture: ComponentFixture<TeamsComponent>;
  let currentTime: Subject<number>;
  let activeTeams: any[];
  let membershipDocs: any[];
  let shelfResponse: () => any;

  const couchServiceMock = {
    currentTime: vi.fn(),
    checkAuthorization: vi.fn(),
    findAll: vi.fn(),
    get: vi.fn()
  };
  const userServiceMock = {
    get: vi.fn().mockReturnValue(user),
    addImageForReplication: vi.fn().mockReturnValue(of({}))
  };
  const dialogsLoadingServiceMock = { start: vi.fn(), stop: vi.fn() };

  // The component only assigns table data once the requests resolve, so emit the time to release the forkJoin
  const loadTeams = () => {
    fixture.detectChanges();
    currentTime.next(1700000000000);
  };
  const teamRow = (id: string) => component.teams.data.find((row: any) => row.doc._id === id);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    currentTime = new Subject<number>();
    activeTeams = [ localTeam, enterprise ];
    membershipDocs = [];
    shelfResponse = () => of({ myTeamIds: [] });
    couchServiceMock.currentTime.mockImplementation(() => currentTime);
    couchServiceMock.checkAuthorization.mockReturnValue(of(true));
    couchServiceMock.findAll.mockImplementation((db: string, query: any = {}) => {
      if (db === 'teams') {
        return of(query.selector && query.selector.status === 'active' ? activeTeams : membershipDocs);
      }
      return of([]);
    });
    couchServiceMock.get.mockImplementation(() => shelfResponse());

    TestBed.configureTestingModule({
      imports: [ TeamsComponent ],
      providers: [
        { provide: CouchService, useValue: couchServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: TeamsService, useValue: {} },
        { provide: DialogsLoadingService, useValue: dialogsLoadingServiceMock },
        { provide: StateService, useValue: { configuration: { planetType: 'community', code: 'planet', name: 'Planet' } } },
        { provide: DeviceInfoService, useValue: { watchDeviceType: () => of(DeviceType.DESKTOP) } },
        { provide: Router, useValue: { navigate: vi.fn(), url: '/teams' } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { myTeams: true, mode: 'team' } } } }
      ]
    });
    TestBed.overrideComponent(TeamsComponent, { set: { template: '', styles: [], imports: [] } });
    fixture = TestBed.createComponent(TeamsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists teams and enterprises from the shelf in My Teams', () => {
    membershipDocs = [];
    shelfResponse = () => of({ myTeamIds: [ localTeam._id, enterprise._id ] });

    loadTeams();

    expect(component.userNotInShelf).toBe(false);
    expect(component.teams.data.length).toBe(2);
    expect(teamRow(localTeam._id).userStatus).toBe('member');
    expect(teamRow(enterprise._id).userStatus).toBe('member');
  });

  it('keeps teams database memberships in My Teams when the user has no shelf document', () => {
    membershipDocs = [
      { _id: 'membership_enterprise', docType: 'membership', teamId: enterprise._id, teamPlanetCode: 'planet', userId: user._id,
        isLeader: true },
      { _id: 'request_local', docType: 'request', teamId: localTeam._id, teamPlanetCode: 'planet', userId: user._id }
    ];
    shelfResponse = () => throwError({ status: 404 });

    loadTeams();

    expect(component.userNotInShelf).toBe(true);
    expect(component.isLoading).toBe(false);
    // Both team types stay in the table, and the membership docs still identify the user's status
    expect(component.teams.data.length).toBe(2);
    expect(teamRow(enterprise._id).userStatus).toBe('member');
    expect(teamRow(enterprise._id).isLeader).toBe(true);
    expect(teamRow(enterprise._id).membershipDoc._id).toBe('membership_enterprise');
    expect(teamRow(localTeam._id).userStatus).toBe('requesting');
    // The My Teams filter keeps the enterprise the user is a member of
    expect(component.teams.filteredData.map((row: any) => row.doc._id)).toEqual([ enterprise._id ]);
    expect(component.displayedColumns).toContain('action');
  });

  it('does not swallow shelf errors other than 404', () => {
    membershipDocs = [ { _id: 'membership_enterprise', docType: 'membership', teamId: enterprise._id, userId: user._id } ];
    shelfResponse = () => throwError({ status: 500 });

    loadTeams();

    expect(component.userNotInShelf).toBe(false);
    expect(component.teams.data.length).toBe(0);
    expect(component.isLoading).toBe(false);
    expect(dialogsLoadingServiceMock.stop).toHaveBeenCalled();
  });
});
