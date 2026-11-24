import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChild, TemplateRef, ViewEncapsulation, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { DeviceInfoService } from '@shared/ui/device-info.service';

@Component({
  selector: 'planet-list-actions',
  templateUrl: './list-actions.component.html',
  styleUrls: [ './list-actions.component.scss' ],
  encapsulation: ViewEncapsulation.None,
  imports: [ NgTemplateOutlet, MatIconButton, MatIcon, MatMenuTrigger, MatToolbar ]
})
export class ListActionsComponent {

  readonly selected = input(0);
  // Without a menu, the actions stay in the bar while rows are selected. The page declares the menu so it can
  // register its own mat-menu-items, which is what gives the menu its keyboard navigation
  readonly menu = input<MatMenuPanel>();
  readonly clearSelection = output<void>();
  @ContentChild('listActions') actionsTemplate: TemplateRef<unknown>;
  readonly compact = this.deviceInfoService.isTabletOrSmaller;
  readonly selecting = computed(() => this.compact() && this.selected() > 0);

  constructor(private deviceInfoService: DeviceInfoService) {}

}
