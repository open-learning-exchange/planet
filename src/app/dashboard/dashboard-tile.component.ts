import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, AfterViewChecked, ChangeDetectorRef, HostBinding } from '@angular/core';
import { tap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { TeamsService } from '../teams/teams.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  selector: 'planet-dashboard-tile',
  templateUrl: './dashboard-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileComponent implements AfterViewChecked {
  @Input() cardTitle: string;
  @Input() cardType: string;
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
  isExpanded = false;
  
  @HostBinding('class.accordion-collapsed') get isCollapsed() { return !this.isExpanded; }
  @HostBinding('class.accordion-expanded') get isExpandedClass() { return this.isExpanded; }
  
  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef
  ) { }

  ngAfterViewChecked() {
    const divHeight = this.itemDiv?.nativeElement.offsetHeight;
    if (!divHeight) {
      return;
    }
    const itemStyle = window.getComputedStyle(this.itemDiv.nativeElement.querySelector('.dashboard-item'));
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
    return window.innerWidth <= 780;
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
    moveItemInArray(this.itemData, event.previousIndex, event.currentIndex);
    const ids = [ ...this.userService.shelf[this.shelfName] ];
    ids.splice(event.currentIndex, 0, ids.splice(event.previousIndex, 1)[0]);
    this.userService.updateShelf(ids, this.shelfName).subscribe(
      () => {},
      () => {
        this.planetMessageService.showAlert($localize`There was an error reordering ${this.cardTitle}`);
        moveItemInArray(this.itemData, event.currentIndex, event.previousIndex);
      }
    );
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
