import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesService } from '../courses/courses.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { DashboardTileComponent } from './dashboard-tile.component';

describe('DashboardTileComponent', () => {
  it('removes a dashboard course only after confirmation', () => {
    const dialogRef = { close: vi.fn() };
    const dialog = { open: vi.fn().mockReturnValue(dialogRef) };
    const coursesService = {
      courseResignAdmission: vi.fn().mockReturnValue(of({}))
    };
    const messageService = { showMessage: vi.fn(), showAlert: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ DashboardTileComponent ],
      providers: [
        { provide: CoursesService, useValue: coursesService },
        { provide: DeviceInfoService, useValue: { watchDeviceType: vi.fn().mockReturnValue(of(undefined)) } },
        { provide: MatDialog, useValue: dialog },
        { provide: PlanetMessageService, useValue: messageService },
        { provide: TeamsService, useValue: {} },
        { provide: UserService, useValue: { get: vi.fn().mockReturnValue({}), shelf: { courseIds: [ 'course-1' ] } } }
      ]
    });
    const component = TestBed.createComponent(DashboardTileComponent).componentInstance;
    component.shelfName = 'courseIds';
    component.cardTitle = 'myCourses';

    component.removeFromShelf({ stopPropagation: vi.fn() }, { _id: 'course-1', title: 'Course 1' });

    const dialogData = dialog.open.mock.calls[0][1].data;
    expect(dialogData.displayName).toBe('Course 1');
    expect(coursesService.courseResignAdmission).not.toHaveBeenCalled();

    dialogData.okClick.request.subscribe(dialogData.okClick.onNext);

    expect(coursesService.courseResignAdmission).toHaveBeenCalledWith('course-1', 'resign', 'Course 1');
    expect(dialogRef.close).toHaveBeenCalled();
    expect(messageService.showMessage).toHaveBeenCalled();
  });
});
