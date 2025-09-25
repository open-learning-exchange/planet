import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, AfterViewChecked,
ChangeDetectorRef, HostBinding, HostListener, OnInit } from '@angular/core';
import { tap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements AfterViewChecked, OnInit {
  @Input() cardTitle: string;
  private _cardType: string;
  @Input() set cardType(value: string) {
    this._cardType = value;
    if (value === 'myLife' && this.deviceType === DeviceType.MOBILE) {
      this.isExpanded = true;
    }
  }
  get cardType(): string {
    return this._cardType;
  }
  @Input() color: string;
  @Input() itemData;
  @Input() link;
  @Input() emptyLink;
  @Input() shelfName: string;
  @Input() isLoading = false;
  @Output() teamRemoved = new EventEmitter<any>();
  @ViewChild('items') itemDiv: ElementRef;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  tileLines = 2;
  recentlyDragged = false;
  isExpanded = false;
  deviceType: DeviceType;

  @HostBinding('class.accordion-collapsed') get isCollapsed() { return !this.isExpanded; }
  @HostBinding('class.accordion-expanded') get isExpandedClass() { return this.isExpanded; }
  @HostListener('window:resize')
  onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    if (this.cardType === 'myLife' && this.deviceType === DeviceType.MOBILE) {
      this.isExpanded = true;
    }
  }

  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    if (this.cardType === 'myLife' && (this.deviceType === DeviceType.SMALL_MOBILE || this.deviceType === DeviceType.MOBILE)) {
      this.isExpanded = true;
    }
  }

  ngAfterViewChecked() {
    const divHeight = this.itemDiv?.nativeElement.offsetHeight;
    const dashboardItem = this.itemDiv.nativeElement.querySelector('.dashboard-item');
    if (!dashboardItem) { return; }
    const itemStyle = window.getComputedStyle(dashboardItem);
    const tilePadding = +(itemStyle.paddingTop.replace('px', '')) * 2;
    const fontSize = +(itemStyle.fontSize.replace('px', ''));
    const tileHeight = divHeight - tilePadding;
    // line-height: normal varies by browser, but should be between 1-1.2
    const tileLines = Math.floor(tileHeight / (fontSize * 1.2));
    if (tileLines !== this.tileLines) {
      this.tileLines = tileLines;
      this.cd.detectChanges();
    }
  }

  toggleAccordion(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      setTimeout(() => {
        this.cd.detectChanges();
      }, 100);
    }
  }

  get isAccordionMode(): boolean {
    return this.deviceType === DeviceType.SMALL_MOBILE || this.deviceType === DeviceType.MOBILE;
  }

  removeFromShelf(event, item: any) {
    event.stopPropagation();
    const { _id: userId, planetCode: userPlanetCode } = this.userService.get();
    if (this.shelfName === 'myTeamIds') {
      this.removeTeam(item, userId, userPlanetCode);
    } else {
      const newIds = this.userService.shelf[this.shelfName].filter((shelfId) => shelfId !== item._id);
      this.userService.updateShelf(newIds, this.shelfName).subscribe(() => this.removeMessage(item));
    }
  }

  removeTeam(item, userId, userPlanetCode) {
    const teamDoc = { userId, userPlanetCode, teamId: item._id, fromShelf: item.fromShelf };
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.teamsService.toggleTeamMembership(item, true, teamDoc).pipe(tap(() => this.teamRemoved.emit(item))),
          onNext: () => {
            this.dialogPrompt.close();
            this.removeMessage(item);
          },
          onError: () => this.planetMessageService.showMessage($localize`There was an error removing ${item.title}`)
        },
        changeType: 'leave',
        type: 'team',
        displayName: item.title
      }
    });
  }

  removeMessage(item) {
    const message = `Removed from ${this.cardTitle}: ${item.title}`;
    this.planetMessageService.showMessage($localize`${message}`);
  }

  drop(event: CdkDragDrop<string[]>) {
    this.recentlyDragged = true;
    moveItemInArray(this.itemData, event.previousIndex, event.currentIndex);
    const uniqueItems = [];
    const seen = new Set();
    for (const item of this.itemData) {
      if (item && item._id && !seen.has(item._id)) {
        seen.add(item._id);
        uniqueItems.push(item);
      }
    }
    this.itemData = uniqueItems;
    const ids = this.itemData
      .filter(item => item !== null && item !== undefined)
      .map(item => item._id || item);
    this.userService.updateShelf(ids, this.shelfName).subscribe(
      () => {},
      () => {
        this.planetMessageService.showAlert($localize`There was an error reordering ${this.cardTitle}`);
        moveItemInArray(this.itemData, event.currentIndex, event.previousIndex);
      }
    );
    this.userService.skipNextShelfRefresh = true;
    setTimeout(() => {
      this.recentlyDragged = false;
    }, 300);
  }

  getRemoveTooltip(cardTitle: string): string {
    return $localize`Remove from ${cardTitle}`;
  }
}

@Component({
  selector: 'planet-dashboard-tile-title',
  template: `
    <mat-icon svgIcon={{cardType}}></mat-icon>
    <span>{{cardTitle}}</span>
  `,
  styleUrls: [ './dashboard-tile-title.scss' ]
})
export class DashboardTileTitleComponent {

  @Input() cardTitle;
  @Input() cardType;

}
