import { computed, ElementRef, signal, Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import { DeviceInfoService, DeviceType, isMobileOrSmaller } from '@shared/ui/device-info.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { UserService } from '@shared/auth/user.service';

import { CoursesService } from '../courses/courses.service';
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
  const createTile = (deviceType: Signal<DeviceType>) => {
    TestBed.configureTestingModule({
      imports: [ DashboardTileComponent ],
      providers: [
        { provide: CoursesService, useValue: {} },
        { provide: DeviceInfoService, useValue: { isMobile: computed(() => isMobileOrSmaller(deviceType())) } },
        { provide: MatDialog, useValue: {} },
        { provide: PlanetMessageService, useValue: {} },
        { provide: TeamsService, useValue: {} },
        { provide: UserService, useValue: {} }
      ]
    }).overrideComponent(DashboardTileComponent, { set: { template: '' } });
    return TestBed.createComponent(DashboardTileComponent);
  };

  describe('title line measurement', () => {
    let fixture: ComponentFixture<DashboardTileComponent>;
    let component: DashboardTileComponent;
    let deviceType: WritableSignal<DeviceType>;
    let detectChanges: Mock<() => void>;

    beforeEach(() => {
      deviceType = signal(DeviceType.DESKTOP);
      detectChanges = vi.fn();
      fixture = createTile(deviceType);
      component = fixture.componentInstance;
      component['cd'].detectChanges = detectChanges;
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
      fixture.componentRef.setInput('cardType', 'myCourses');

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
      deviceType.set(DeviceType.MOBILE);

      expect(component.dashboardTextLines({ coverFileName: 'cover.png' })).toBe('none');
    });

    it('builds coverImageUrl for myTeams and myCourses with respective dbs', () => {
      fixture.componentRef.setInput('cardType', 'myTeams');
      expect(component.coverImageUrl({ _id: 't1', coverFileName: 'cover.png' })).toContain('/teams/t1/cover.png');

      fixture.componentRef.setInput('cardType', 'myCourses');
      expect(component.coverImageUrl({ _id: 'c1', coverFileName: 'cover.png' })).toContain('/courses/c1/cover.png');
    });
  });

  describe('accordion expansion', () => {
    const renderTile = (cardType: string, deviceType: Signal<DeviceType>) => {
      const fixture = createTile(deviceType);
      fixture.componentRef.setInput('cardType', cardType);
      fixture.componentInstance['cd'].detectChanges = vi.fn();
      return fixture.componentInstance;
    };

    it('expands the myLife tile when the device becomes mobile', () => {
      const deviceType = signal(DeviceType.DESKTOP);
      const tile = renderTile('myLife', deviceType);
      expect(tile.isExpanded()).toBe(false);

      deviceType.set(DeviceType.MOBILE);

      expect(tile.isExpanded()).toBe(true);
    });

    it('keeps a collapsed myLife tile collapsed across device changes', () => {
      const deviceType = signal(DeviceType.MOBILE);
      const tile = renderTile('myLife', deviceType);

      tile.toggleAccordion(new Event('click'));

      [DeviceType.SMALL_MOBILE, DeviceType.TABLET, DeviceType.MOBILE].forEach(type => {
        deviceType.set(type);
        expect(tile.isExpanded()).toBe(false);
      });
    });

    it('starts other tiles collapsed and keeps their toggle across device changes', () => {
      const deviceType = signal(DeviceType.MOBILE);
      const tile = renderTile('myCourses', deviceType);
      expect(tile.isExpanded()).toBe(false);

      tile.toggleAccordion(new Event('click'));
      deviceType.set(DeviceType.DESKTOP);

      expect(tile.isExpanded()).toBe(true);
    });
  });

  it('removes a dashboard course only after confirmation, leaving messages to the course service', () => {
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
        { provide: DeviceInfoService, useValue: { isMobile: signal(false) } },
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
    expect(messageService.showMessage).not.toHaveBeenCalled();

    dialogRef.close.mockClear();
    dialogData.okClick.onError({ status: 500 });

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(messageService.showMessage).not.toHaveBeenCalled();
  });
});
