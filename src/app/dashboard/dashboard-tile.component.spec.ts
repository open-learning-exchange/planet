import { ElementRef, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DeviceType } from '../shared/device-info.service';
import { DashboardTileComponent } from './dashboard-tile.component';

function tileElement(
  className: string,
  offsetHeight: number,
  padding = '0',
  lineHeight = 'normal',
  tagName = 'div'
): HTMLElement {
  const element = document.createElement(tagName);
  element.className = className;
  element.style.paddingTop = padding;
  element.style.paddingBottom = padding;
  element.style.fontSize = '16px';
  element.style.lineHeight = lineHeight;
  Object.defineProperty(element, 'offsetHeight', { value: offsetHeight, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: offsetHeight, configurable: true });
  return element;
}

describe('DashboardTileComponent', () => {
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
    const courseItem = tileElement('dashboard-item has-course-cover', 200, '8px');
    const courseCover = tileElement('dashboard-course-cover', 48);
    courseCover.style.marginBottom = '4px';
    courseItem.append(courseCover);
    const regularItem = tileElement('dashboard-item', 200, '16px');
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
    const item = tileElement('dashboard-item', 200, '16px', '24px');
    item.append(tileElement('', 24, '0', 'normal', 'p'));
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
