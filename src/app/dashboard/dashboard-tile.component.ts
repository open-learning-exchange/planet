import { Component, Input, ElementRef, ViewChild, Output, EventEmitter, AfterViewChecked, ChangeDetectorRef, HostListener, OnInit } from '@angular/core';
import { elementAt, tap } from 'rxjs/operators';
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
export class DashboardTileComponent implements OnInit {
  @Input() cardTitle: string;
  @Input() cardType: string;
  @Input() color: string;
  @Input() itemData;
  @Input() link;
  @Input() emptyLink;
  @Input() shelfName: string;
  @Output() teamRemoved = new EventEmitter<any>();
  // @ViewChild('items') itemDiv: ElementRef;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  // tileLines = 2;
  screenWidth: number;
  showAccordion: boolean;

  constructor(
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    // private cd: ChangeDetectorRef
  ) { }

  // ngAfterViewChecked() {
  //   const divHeight = this.itemDiv.nativeElement.offsetHeight;
  //   const itemStyle = window.getComputedStyle(this.itemDiv.nativeElement.querySelector('.dashboard-item'));
  //   const tilePadding = +(itemStyle.paddingTop.replace('px', '')) * 2;
  //   const fontSize = +(itemStyle.fontSize.replace('px', ''));
  //   const tileHeight = divHeight - tilePadding;
  //   // line-height: normal varies by browser, but should be between 1-1.2
  //   const tileLines = Math.floor(tileHeight / (fontSize * 1.2));
  //   if (tileLines !== this.tileLines) {
  //     this.tileLines = tileLines;
  //     this.cd.detectChanges();
  //   }
  // }

  ngOnInit(): void {
    this.screenWidth = window.innerWidth;
    this.setAccordion();
  }

  removeFromShelf(element: {event, item: any}) {
    element.event.stopPropagation();
    const { _id: userId, planetCode: userPlanetCode } = this.userService.get();
    if (this.shelfName === 'myTeamIds') {
      this.removeTeam(element.item, userId, userPlanetCode);
    } else {
      const newIds = this.userService.shelf[this.shelfName].filter((shelfId) => shelfId !== element.item._id);
      this.userService.updateShelf(newIds, this.shelfName).subscribe(() => this.removeMessage(element.item));
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
    this.planetMessageService.showMessage($localize`${item.title} removed from ${this.cardTitle}`);
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

  setAccordion() {
    this.screenWidth <= 600 ? this.showAccordion = true : this.showAccordion = false;
  }

  @HostListener('window:resize') onResize() {
    this.screenWidth = window.innerWidth;
    this.setAccordion();
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

@Component({
  selector: 'planet-dashboard-row-layout',
  templateUrl: './dashboard-tile-row-layout.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileRowLayoutComponent {

  @Input() cardTitle;
  @Input() link;
  @Input() emptyLink;
  @Input() itemData;
  @Output() droppedEvent = new EventEmitter<any>();
  @Output() removeEvent = new EventEmitter<any>();

  drop(event: CdkDragDrop<string[]>) {
    this.droppedEvent.emit(event);
  }

  removeFromShelf(element: {event, item: any}) {
    this.removeEvent.emit(element);
  }

}

@Component({
  selector: 'planet-dashboard-accordion-layout',
  templateUrl: './dashboard-tile-accordion-layout.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileAccordionLayoutComponent {

  @Input() showAccordion;
  @Input() cardTitle;
  @Input() link;
  @Input() emptyLink;
  @Input() itemData;
  @Output() droppedEvent = new EventEmitter<any>();
  @Output() removeEvent = new EventEmitter<Object>();

  drop(event: CdkDragDrop<string[]>) {
    this.droppedEvent.emit(event);
  }

  removeFromShelf(element: {event, item: any}) {
    this.removeEvent.emit(element);
  }

}

@Component({
  selector: 'planet-dashboard-left-tile',
  templateUrl: './dashboard-tile-left-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileLeftTileComponent {

  @Input() cardTitle;
  @Input() cardType;
  @Input() link;
  @Input() emptyLink;
}


@Component({
  selector: 'planet-dashboard-right-tile',
  templateUrl: './dashboard-tile-right-tile.component.html',
  styleUrls: [ './dashboard-tile.scss' ]
})
export class DashboardTileRightTileComponent implements AfterViewChecked {

  @Input() cardTitle;
  @Input() itemData;
  @Input() link;
  @Input() emptyLink;
  @Output() droppedEvent = new EventEmitter<any>();
  @Output() removeEvent = new EventEmitter<Object>();
  @ViewChild('items') itemDiv: ElementRef;
  tileLines = 2;

  constructor( private cd: ChangeDetectorRef ) {}

  ngAfterViewChecked() {
    const divHeight = this.itemDiv.nativeElement.offsetHeight;
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

  drop(event: CdkDragDrop<string[]>) {
    this.droppedEvent.emit(event);
  }

  removeFromShelf(event, item: any) {
    this.removeEvent.emit({ event, item });
  }
}
