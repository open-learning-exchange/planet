import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatMenu } from '@angular/material/menu';

import { DeviceInfoService, DeviceType, isMobileOrSmaller, isTabletOrSmaller } from './device-info.service';
import { ViewActionsComponent } from './view-actions.component';

@Component({
  template: `
    <planet-view-actions [menu]="menu" [edit]="edit" [actions]="actions">Title</planet-view-actions>
    <mat-menu #menu="matMenu"></mat-menu>
    <ng-template #edit><span class="km-edit"></span></ng-template>
    <ng-template #actions><span class="km-action"></span></ng-template>
  `,
  imports: [ ViewActionsComponent, MatMenu ]
})
class HostComponent {}

describe('ViewActionsComponent', () => {
  const deviceType = signal(DeviceType.DESKTOP);

  const render = (type: DeviceType) => {
    deviceType.set(type);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return {
      edit: !!element.querySelector('.km-edit'),
      actions: !!element.querySelector('.km-action'),
      menu: !!element.querySelector('.km-view-actions-menu')
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HostComponent, MatIconTestingModule ],
      providers: [ {
        provide: DeviceInfoService,
        useValue: {
          isMobile: computed(() => isMobileOrSmaller(deviceType())),
          isTabletOrSmaller: computed(() => isTabletOrSmaller(deviceType()))
        }
      } ]
    });
  });

  it('shows edit and actions in the bar on desktop', () => {
    expect(render(DeviceType.DESKTOP)).toEqual({ edit: true, actions: true, menu: false });
  });

  it('keeps edit in the bar and moves actions into the menu on tablets', () => {
    expect(render(DeviceType.TABLET)).toEqual({ edit: true, actions: false, menu: true });
  });

  it('shows only the menu on phones', () => {
    expect(render(DeviceType.MOBILE)).toEqual({ edit: false, actions: false, menu: true });
  });
});
