import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ReportsDetailComponent } from './reports-detail.component';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { CsvService } from '../../shared/csv.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CouchService } from '../../shared/couchdb.service';
import { UsersService } from '../../users/users.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';

class MockReportsService {
  standardTimeFilters = [];
  getChatHistory = jasmine.createSpy('getChatHistory').and.returnValue(of([]));
  getVoicesCreated = jasmine.createSpy('getVoicesCreated').and.returnValue(of([]));
  getDateRange = jasmine.createSpy('getDateRange').and.returnValue({
    startDate: new Date(),
    endDate: new Date(),
    showCustomDateFields: false
  });
}

const stateServiceStub = {
  configuration: {
    code: 'planet-code',
    parentCode: 'parent-code',
    adminName: 'admin@example.com'
  }
};

const noop = () => {};

describe('ReportsDetailComponent', () => {
  let component: ReportsDetailComponent;
  let reportsService: MockReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ ReportsDetailComponent ],
      providers: [
        UntypedFormBuilder,
        { provide: ReportsService, useClass: MockReportsService },
        { provide: StateService, useValue: stateServiceStub },
        { provide: ActivatedRoute, useValue: { paramMap: of({}), queryParams: of({}) } },
        { provide: Router, useValue: {} },
        { provide: Location, useValue: { replaceState: noop } },
        { provide: DialogsLoadingService, useValue: { start: noop, stop: noop } },
        { provide: CsvService, useValue: {} },
        { provide: DialogsFormService, useValue: { closeDialogsForm: noop } },
        { provide: CouchService, useValue: {} },
        { provide: UsersService, useValue: { requestUserData: noop, usersListener: () => of([]) } },
        { provide: MatDialog, useValue: {} },
        { provide: DeviceInfoService, useValue: { getDeviceType: () => DeviceType.DESKTOP } }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    });

    reportsService = TestBed.inject(ReportsService) as unknown as MockReportsService;
    const fixture = TestBed.createComponent(ReportsDetailComponent);
    component = fixture.componentInstance;
  });

  it('filters chat data and updates usage when chat history loads', () => {
    const chatData = [{ createdDate: new Date().toISOString(), user: 'test-user' }];
    reportsService.getChatHistory.and.returnValue(of(chatData));
    spyOn(component.chatActivities, 'filter').and.callThrough();
    spyOn(component, 'setChatUsage').and.stub();

    component.getChatUsage();

    expect(component.chatActivities.data).toEqual(chatData);
    expect(component.chatActivities.filter).toHaveBeenCalledWith(component.filter);
    expect(component.setChatUsage).toHaveBeenCalled();
    expect(component.chatLoading).toBeFalse();
  });

  it('filters voices data and updates usage when voices are loaded', () => {
    const voicesData = [{ time: new Date().toISOString(), user: { name: 'voice-user' } }];
    reportsService.getVoicesCreated.and.returnValue(of(voicesData));
    spyOn(component.voicesActivities, 'filter').and.callThrough();
    spyOn(component, 'setVoicesUsage').and.stub();

    component.getVoicesUsage();

    expect(component.voicesActivities.data[0].user).toEqual('voice-user');
    expect(component.voicesActivities.filter).toHaveBeenCalledWith(component.filter);
    expect(component.setVoicesUsage).toHaveBeenCalled();
    expect(component.voicesLoading).toBeFalse();
  });
});
