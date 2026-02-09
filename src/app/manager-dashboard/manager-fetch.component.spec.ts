import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ManagerFetchComponent } from './manager-fetch.component';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { formatDate } from '../shared/utils';
import { of } from 'rxjs';
import { ManagerService } from './manager.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ManagerFetchComponent', () => {
  let component: ManagerFetchComponent;
  let fixture: ComponentFixture<ManagerFetchComponent>;
  let managerServiceMock: any;

  beforeEach(waitForAsync(() => {
    managerServiceMock = {
      getPushedList: jasmine.createSpy('getPushedList').and.returnValue(of([]))
    };

    TestBed.configureTestingModule({
      declarations: [ ManagerFetchComponent ],
      providers: [
        { provide: ManagerService, useValue: managerServiceMock },
        { provide: CouchService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: StateService, useValue: { configuration: {} } },
        { provide: SyncService, useValue: {} },
        { provide: PlanetMessageService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagerFetchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filtering', () => {
    let pushedItems: any[];

    beforeEach(() => {
      pushedItems = [
        {
          _id: '1',
          db: 'resources',
          item: { doc: { title: 'Math Resource' } },
          time: new Date(2023, 0, 1, 10, 0, 0).getTime() // Jan 1 2023 10:00 local
        },
        {
          _id: '2',
          db: 'courses',
          item: { doc: { courseTitle: 'Science Course' } },
          time: new Date(2023, 0, 2, 10, 0, 0).getTime() // Jan 2 2023 10:00 local
        },
        {
          _id: '3',
          db: 'resources',
          item: { doc: { title: 'History Resource' } },
          time: new Date(2023, 0, 1, 15, 0, 0).getTime() // Jan 1 2023 15:00 local
        }
      ];
      component.pushedItems.data = pushedItems;
    });

    it('should filter by name (resource title)', () => {
      component.filterName = 'Math';
      component.applyFilter();
      expect(component.pushedItems.filteredData.length).toBe(1);
      expect((component.pushedItems.filteredData[0] as any)._id).toBe('1');
    });

    it('should filter by name (course title)', () => {
      component.filterName = 'Science';
      component.applyFilter();
      expect(component.pushedItems.filteredData.length).toBe(1);
      expect((component.pushedItems.filteredData[0] as any)._id).toBe('2');
    });

    it('should filter by date', () => {
      const date = new Date(2023, 0, 1); // Jan 1 2023 local
      component.filterDate = date;
      component.applyFilter();
      expect(component.pushedItems.filteredData.length).toBe(2); // ID 1 and 3 are on Jan 1st
      const ids = component.pushedItems.filteredData.map((d: any) => d._id);
      expect(ids).toContain('1');
      expect(ids).toContain('3');
    });

    it('should filter by name and date', () => {
      component.filterName = 'History';
      const date = new Date(2023, 0, 1); // Jan 1 2023 local
      component.filterDate = date;
      component.applyFilter();
      expect(component.pushedItems.filteredData.length).toBe(1);
      expect((component.pushedItems.filteredData[0] as any)._id).toBe('3');
    });

    it('should match case insensitive name', () => {
      component.filterName = 'math';
      component.applyFilter();
      expect(component.pushedItems.filteredData.length).toBe(1);
      expect((component.pushedItems.filteredData[0] as any)._id).toBe('1');
    });

    it('should show all items if filters are empty', () => {
        component.filterName = '';
        component.filterDate = null;
        component.applyFilter();
        expect(component.pushedItems.filteredData.length).toBe(3);
    });
  });
});
