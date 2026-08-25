import { ElementRef, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesService } from '../courses/courses.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { DashboardTileComponent } from './dashboard-tile.component';

const tileElement = (
  className: string,
  offsetHeight: number,
  padding = '0',
  lineHeight = 'normal',
  tagName = 'div'
): HTMLElement => {
  const element = document.createElement(tagName);
  element.className = className;
  element.style.paddingTop = padding;
  element.style.paddingBottom = padding;
  element.style.fontSize = '16px';
  element.style.lineHeight = lineHeight;
  Object.defineProperty(element, 'offsetHeight', { value: offsetHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: offsetHeight, configurable: true });
  return element;
};

describe('DashboardTileComponent', () => {
  describe('title line measurement', () => {
    let component: DashboardTileComponent;
    let detectChanges: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      detectChanges = vi.fn();
      component = runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new DashboardTileComponent(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        { detectChanges } as any,
        { watchDeviceType: vi.fn(() => of(DeviceType.DESKTOP)) } as any
      ));
    });

    it('does not measure tiles before the view is available', () => {
      expect(() => component.ngAfterViewChecked()).not.toThrow();
      expect(detectChanges).not.toHaveBeenCalled();
    });

    it('measures regular and course title lines independently', () => {
      const itemDiv = tileElement('', 115);
      Object.defineProperty(itemDiv, 'clientHeight', { value: 100 });
      const courseItem = tileElement('dashboard-item has-course-cover', 200);
      const courseItemLink = tileElement('dashboard-item-link', 200, '8px', 'normal', 'a');
      const courseCover = tileElement('dashboard-course-cover', 48);
      courseCover.style.marginBottom = '4px';
      courseItemLink.append(courseCover);
      courseItem.append(courseItemLink);
      const regularItem = tileElement('dashboard-item', 200);
      regularItem.append(tileElement('dashboard-item-link', 200, '16px', 'normal', 'a'));
      itemDiv.append(courseItem, regularItem);
      component.itemDiv = new ElementRef(itemDiv);
      component.cardType = 'myCourses';

      component.ngAfterViewChecked();

      expect(component.tileLines).toBe(3);
      expect(component.courseTileLines).toBe(1);
      expect(component.dashboardTextLines({ coverFileName: 'cover.png' })).toBe(1);
      expect(component.dashboardTextLines({})).toBe(3);
      expect(detectChanges).toHaveBeenCalledOnce();
    });

    it('reserves first-line height and uses an explicit line height', () => {
      const itemDiv = tileElement('', 100);
      const item = tileElement('dashboard-item', 200);
      const itemLink = tileElement('dashboard-item-link', 200, '16px', '24px', 'a');
      itemLink.append(tileElement('', 24, '0', 'normal', 'p'));
      item.append(itemLink);
      itemDiv.append(item);
      component.itemDiv = new ElementRef(itemDiv);

      component.ngAfterViewChecked();

      expect(component.tileLines).toBe(1);
    });

    it('does not clamp titles in accordion mode', () => {
      component.deviceType = DeviceType.MOBILE;

      expect(component.dashboardTextLines({ coverFileName: 'cover.png' })).toBe('none');
    });
  });

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
