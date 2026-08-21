import {
  Component, Input, ElementRef, ViewChild, Output, EventEmitter, AfterViewChecked,
  ChangeDetectorRef, DestroyRef, HostBinding, OnInit, forwardRef, inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { MatCard } from '@angular/material/card';
import { NgClass, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthorizedRolesDirective } from '../shared/authorized-roles.directive';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';
import { MatIconButton } from '@angular/material/button';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { TruncateTextPipe } from '../shared/truncate-text.pipe';
import { environment } from '../../environments/environment';
import { couchAttachmentUrl } from '../shared/utils';

@Component({
  selector: 'planet-dashboard-tile-title',
  template: `
    <mat-icon svgIcon={{cardType}}></mat-icon>
    <span>{{cardTitle}}</span>
  `,
  styleUrls: ['./dashboard-tile-title.scss'],
  imports: [MatIcon]
})
export class DashboardTileTitleComponent {

  @Input() cardTitle;
  @Input() cardType;

}

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: ['./dashboard-tile.scss'],
  imports: [
    MatCard,
    RouterLink,
    forwardRef(() => DashboardTileTitleComponent),
    MatIcon,
    CdkDropList,
    NgClass,
    AuthorizedRolesDirective,
    CdkDrag,
    MatTooltip,
    MatBadge,
    NgStyle,
    MatIconButton,
    PlanetLoadingSpinnerComponent,
    TruncateTextPipe
  ]
})
export class DashboardTileComponent implements AfterViewChecked, OnInit {
  private readonly destroyRef = inject(DestroyRef);
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
  courseTileLines = 2;
  recentlyDragged = false;
  isExpanded = false;
  deviceType: DeviceType;

  @HostBinding('class.accordion-collapsed') get isCollapsed() {
    return !this.isExpanded;
  }
  @HostBinding('class.accordion-expanded') get isExpandedClass() {
    return this.isExpanded;
  }
  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceInfoService.watchDeviceType()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((deviceType) => {
        this.deviceType = deviceType;
        if (this.cardType === 'myLife' && (deviceType === DeviceType.SMALL_MOBILE || deviceType === DeviceType.MOBILE)) {
          this.isExpanded = true;
        }
      });
  }

  ngOnInit() {
    if (this.cardType === 'myLife' && (this.deviceType === DeviceType.SMALL_MOBILE || this.deviceType === DeviceType.MOBILE)) {
      this.isExpanded = true;
    }
  }

  ngAfterViewChecked() {
    const itemDiv = this.itemDiv?.nativeElement;
    if (!itemDiv) {
      return;
    }
    const dashboardItem = itemDiv.querySelector('.dashboard-item:not(.has-course-cover)') ??
      itemDiv.querySelector('.dashboard-item');
    if (!dashboardItem) {
      return;
    }
    const tileLines = this.textLinesForItem(dashboardItem, itemDiv.clientHeight);
    const courseItem = itemDiv.querySelector('.dashboard-item.has-course-cover');
    const courseTileLines = courseItem ?
      this.textLinesForItem(courseItem, itemDiv.clientHeight) : this.courseTileLines;
    if (tileLines !== this.tileLines || courseTileLines !== this.courseTileLines) {
      this.tileLines = tileLines;
      this.courseTileLines = courseTileLines;
      this.cd.detectChanges();
    }
  }

  private textLinesForItem(item: HTMLElement, availableHeight: number): number {
    const itemStyle = window.getComputedStyle(item);
    const padding = this.cssPixels(itemStyle.paddingTop) + this.cssPixels(itemStyle.paddingBottom);
    const reservedHeight = Array.from(item.children)
      .filter(element => element.matches('.dashboard-course-cover, p:not(.dashboard-text)'))
      .reduce((height, element) => height + this.elementOuterHeight(element as HTMLElement), 0);
    const fontSize = this.cssPixels(itemStyle.fontSize) || 16;
    // line-height: normal varies by browser, but should be between 1-1.2
    const lineHeight = this.cssPixels(itemStyle.lineHeight) || fontSize * 1.2;
    return Math.max(1, Math.floor((availableHeight - padding - reservedHeight) / lineHeight));
  }

  private elementOuterHeight(element: HTMLElement): number {
    const elementStyle = window.getComputedStyle(element);
    return element.offsetHeight + this.cssPixels(elementStyle.marginTop) + this.cssPixels(elementStyle.marginBottom);
  }

  private cssPixels(value: string): number {
    return parseFloat(value) || 0;
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
    } else if (this.shelfName === 'resourceIds') {
      this.removeResource(item);
    } else {
      const newIds = this.userService.shelf[this.shelfName].filter((shelfId) => shelfId !== item._id);
      this.userService.updateShelf(newIds, this.shelfName).subscribe(() => this.removeMessage(item));
    }
  }

  removeResource(item: any) {
    const dialogRef = this.dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'remove',
        type: 'resource',
        displayName: item.title,
        okClick: {
          request: defer(() => this.userService.updateShelf(
            this.userService.shelf.resourceIds.filter((shelfId) => shelfId !== item._id),
            'resourceIds'
          )),
          onNext: () => {
            dialogRef.close();
            this.removeMessage(item);
          },
          onError: () => this.planetMessageService.showMessage($localize`There was an error removing ${item.title}`)
        }
      }
    });
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
    this.planetMessageService.showMessage($localize`Removed from ${this.cardTitle}:cardTitle:: ${item.title}:itemTitle:`);
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

  dashboardTextLines(item: any): number | 'none' {
    if (this.isAccordionMode) {
      return 'none';
    }
    return this.cardType === 'myCourses' && item.coverFileName ? this.courseTileLines : this.tileLines;
  }

  coverImageUrl(item: any): string {
    return couchAttachmentUrl(environment.couchAddress, 'courses', item._id, item.coverFileName);
  }
}
