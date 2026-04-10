import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { DashboardTileComponent, DashboardTileTitleComponent } from './dashboard-tile.component';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { of, throwError } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

describe('DashboardTileComponent', () => {
  let component: DashboardTileComponent;
  let fixture: ComponentFixture<DashboardTileComponent>;
  let mockPlanetMessageService: any;
  let mockUserService: any;
  let mockTeamsService: any;
  let mockDialog: any;
  let mockDeviceInfoService: any;
  let mockChangeDetectorRef: any;

  beforeEach(waitForAsync(() => {
    mockPlanetMessageService = jasmine.createSpyObj('PlanetMessageService', ['showMessage', 'showAlert']);

    mockUserService = jasmine.createSpyObj('UserService', ['get', 'updateShelf']);
    mockUserService.get.and.returnValue({ _id: 'user123', planetCode: 'planetX' });
    mockUserService.shelf = { myItems: ['item1', 'item2'], myTeamIds: ['team1', 'team2'] };
    mockUserService.updateShelf.and.returnValue(of({}));

    mockTeamsService = jasmine.createSpyObj('TeamsService', ['toggleTeamMembership']);
    mockTeamsService.toggleTeamMembership.and.returnValue(of({}));

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({
      close: jasmine.createSpy('close')
    });

    mockDeviceInfoService = jasmine.createSpyObj('DeviceInfoService', ['getDeviceType']);
    mockDeviceInfoService.getDeviceType.and.returnValue(DeviceType.DESKTOP);

    TestBed.configureTestingModule({
      declarations: [ DashboardTileComponent, DashboardTileTitleComponent ],
      providers: [
        { provide: PlanetMessageService, useValue: mockPlanetMessageService },
        { provide: UserService, useValue: mockUserService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: DeviceInfoService, useValue: mockDeviceInfoService },
      ],
      schemas: [NO_ERRORS_SCHEMA] // Suppresses unknown properties/elements errors
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardTileComponent);
    component = fixture.componentInstance;
    component.itemData = [];
    component.shelfName = 'myItems';
    component.cardTitle = 'My Items';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize cardType correctly', () => {
    component.itemData = [];
    component.cardType = 'myLife';
    expect(component.cardType).toBe('myLife');
  });

  it('should expand if cardType is myLife and device is mobile on init', () => {
    mockDeviceInfoService.getDeviceType.and.returnValue(DeviceType.MOBILE);
    // recreate component to trigger constructor & ngOnInit with new device type
    fixture = TestBed.createComponent(DashboardTileComponent);
    component = fixture.componentInstance;
    component.itemData = [];
    component.cardType = 'myLife';
    fixture.detectChanges();
    expect(component.isExpanded).toBe(true);
  });

  it('should toggle accordion', fakeAsync(() => {
    const event = jasmine.createSpyObj('Event', ['preventDefault', 'stopPropagation']);
    expect(component.isExpanded).toBe(false);

    component.toggleAccordion(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.isExpanded).toBe(true);

    tick(100); // simulate setTimeout

    component.toggleAccordion(event);
    expect(component.isExpanded).toBe(false);
  }));

  it('should return isAccordionMode correctly based on device type', () => {
    component.deviceType = DeviceType.DESKTOP;
    expect(component.isAccordionMode).toBe(false);

    component.deviceType = DeviceType.MOBILE;
    expect(component.isAccordionMode).toBe(true);

    component.deviceType = DeviceType.SMALL_MOBILE;
    expect(component.isAccordionMode).toBe(true);
  });

  describe('removeFromShelf', () => {
    it('should call removeTeam if shelfName is myTeamIds', () => {
      spyOn(component, 'removeTeam');
      component.shelfName = 'myTeamIds';
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);
      const item = { _id: 'team1', title: 'Test Team' };

      component.removeFromShelf(event, item);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.removeTeam).toHaveBeenCalledWith(item, 'user123', 'planetX');
    });

    it('should call userService.updateShelf if shelfName is not myTeamIds', () => {
      spyOn(component, 'removeMessage');
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);
      const item = { _id: 'item1', title: 'Test Item' };

      component.removeFromShelf(event, item);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockUserService.updateShelf).toHaveBeenCalledWith(['item2'], 'myItems');
      expect(component.removeMessage).toHaveBeenCalledWith(item);
    });
  });

  describe('removeTeam', () => {
    it('should open dialog and set up okClick properly', () => {
      const item = { _id: 'team1', title: 'Test Team', fromShelf: true };

      component.removeTeam(item, 'user123', 'planetX');

      expect(mockDialog.open).toHaveBeenCalled();
      const callArgs = mockDialog.open.calls.mostRecent().args;
      expect(callArgs[0]).toBe(DialogsPromptComponent);
      expect(callArgs[1].data.changeType).toBe('leave');
      expect(callArgs[1].data.type).toBe('team');
      expect(callArgs[1].data.displayName).toBe('Test Team');

      // Test the callbacks
      spyOn(component, 'removeMessage');
      callArgs[1].data.okClick.onNext();
      expect(component.dialogPrompt.close).toHaveBeenCalled();
      expect(component.removeMessage).toHaveBeenCalledWith(item);

      callArgs[1].data.okClick.onError();
      expect(mockPlanetMessageService.showMessage).toHaveBeenCalled();
    });
  });

  describe('drop', () => {
    it('should reorder items and update shelf', fakeAsync(() => {
      component.itemData = [
        { _id: 'item1' },
        { _id: 'item2' },
        { _id: 'item3' }
      ];

      const event = {
        previousIndex: 0,
        currentIndex: 2
      } as CdkDragDrop<string[]>;

      component.drop(event);

      expect(component.recentlyDragged).toBe(true);
      expect(mockUserService.updateShelf).toHaveBeenCalledWith(['item2', 'item3', 'item1'], 'myItems');
      expect(mockUserService.skipNextShelfRefresh).toBe(true);

      tick(300);
      expect(component.recentlyDragged).toBe(false);
    }));

    it('should show alert and revert on error', fakeAsync(() => {
      mockUserService.updateShelf.and.returnValue(throwError('error'));

      component.itemData = [
        { _id: 'item1' },
        { _id: 'item2' }
      ];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as CdkDragDrop<string[]>;

      component.drop(event);

      expect(mockPlanetMessageService.showAlert).toHaveBeenCalled();
      // Item array should be reverted to original order
      expect(component.itemData[0]._id).toBe('item1');
      expect(component.itemData[1]._id).toBe('item2');

      tick(300);
    }));
  });

  it('should return correct remove tooltip text', () => {
    expect(component.getRemoveTooltip('My Items')).toContain('Remove from My Items');
  });
});
