import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import allLocales from '@fullcalendar/core/locales-all';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { DialogsPromptComponent } from './dialogs/dialogs-prompt.component';
import { days, millisecondsToDay } from '../meetups/constants';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';
import { addDateAndTime, styleVariables } from './utils';
import { AuthService } from './auth-guard.service';
import { TasksService } from '../tasks/tasks.service';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { PlanetMessageService } from './planet-message.service';
import { DialogsLoadingService } from './dialogs/dialogs-loading.service';

@Component({
  selector: 'planet-calendar',
  styleUrls: [ './calendar.component.scss' ],
  template: `
    <full-calendar #calendar [options]="calendarOptions"></full-calendar>
    <div class="calendar-legend" *ngIf="showLegend">
      <div *ngFor="let legend of eventLegend">
        <div class="legend-item" *ngIf="!legend.type || legend.type === type">
          <div class="legend-color" [style.backgroundColor]="legend.color"></div>
          <span>{{ legend.label }}</span>
        </div>
      </div>
    </div>
  `
})
export class PlanetCalendarComponent implements OnInit, OnChanges {

  @ViewChild('calendar') calendar: any;
  @Input() resizeCalendar: boolean;
  @Input() link: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  @Input() type = '';

  @Input() header?: any = {
    left: 'title',
    center: '',
    right: 'addEventButton today prev,next'
  };
  @Input() buttonText?: any = {
    today: $localize`Today`
  };
  @Input() _events: any[] = [ {} ];
  // Initializing events with blank object as first array value ensures calendar renders even if there are no events found
  events: any[] = [ {} ];
  calendarPlugins = [ dayGridPlugin, interactionPlugin ];
  buttons = {};
  eventTimeFormat = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  dbName = 'meetups';
  meetups: any[] = [];
  tasks: any[] = [];
  showLegend = true;
  eventLegend = [
    { color: styleVariables.primary, label: 'Event' },
    { color: 'orange', label: 'Uncompleted Task', type: 'team' },
    { color: 'grey', label: 'Completed Task', type: 'team' }
  ];

  calendarOptions: CalendarOptions = {
    plugins: [
      dayGridPlugin,
      interactionPlugin
    ],
    initialView: 'dayGridMonth',
    contentHeight: 'auto',
    locales: allLocales,
    locale: this.document.documentElement.lang,
    events: this.events,
    customButtons: this.buttons,
    firstDay: 6,
    dayMaxEventRows: 2,
    selectable: true,
    select: (arg) => {
      this.authService.checkAuthenticationStatus().subscribe(() => this.openAddEventDialog(arg));
    },
    eventClick: this.eventClick.bind(this)
  };

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private dialog: MatDialog,
    private couchService: CouchService,
    private authService: AuthService,
    private tasksService: TasksService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnInit() {
    this.getMeetups();
    this.getTasks();
    this.buttons = this.editable ?
      {
        addEventButton: {
          text: $localize`Add Event`,
          click: (arg) => {
            this.authService.checkAuthenticationStatus().subscribe(() => this.openAddEventDialog(arg));
          }
        }
      } :
      {};
    this.calendarOptions.headerToolbar = this.header;
    this.calendarOptions.buttonText = this.buttonText;
    this.calendarOptions.customButtons = this.buttons;
    this.calendarOptions.events = [ ...this.events, ...this._events ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.resizeCalendar && changes.resizeCalendar.currentValue) {
      this.calendar.getApi().updateSize();
      this.resizeCalendar = false;
    }
    this.calendarOptions.events = [ ...this.events, ...this._events ];
  }

  getMeetups() {
    this.couchService.findAll(this.dbName, findDocuments({ link: this.link })).subscribe((meetups: any[]) => {
      this.meetups = meetups.map(meetup => {
        switch (meetup.recurring) {
          case 'daily':
            return this.dailyEvents(meetup);
          case 'weekly':
            return this.weeklyEvents(meetup);
          case 'none':
          default:
            return this.eventObject(meetup);
        }
      }).flat();
      this.events = [ ...this.meetups, ...this.tasks ];
      this.calendarOptions.events = this.events;
    });
  }

  getTasks() {
    this.couchService.findAll('tasks', findDocuments({ link: this.link })).subscribe((tasks: any[]) => {
      this.tasks = tasks.filter(task => task.status !== 'archived').map(task => {
        const taskColors = task.completed ? {
          backgroundColor: styleVariables.grey, borderColor: styleVariables.grey, textColor: styleVariables.greyText
        } : {
          backgroundColor: styleVariables.accent, borderColor: styleVariables.accent, textColor: styleVariables.accentText
        };
        return this.eventObject({ ...task, isTask: true }, task.deadline, task.deadline, taskColors);
      });
      this.events = [ ...this.meetups, ...this.tasks ];
      this.calendarOptions.events = this.events;
    });
  }

  eventObject(
    meetup,
    startDate = meetup.startDate,
    endDate = meetup.endDate || startDate,
    otherProps: any = {
      backgroundColor: styleVariables.primary, borderColor: styleVariables.primary, textColor: styleVariables.primaryText
    }
  ) {
    const allDay = !meetup.isTask && meetup.startTime === undefined || meetup.startTime === '';
    return {
      title: meetup.title,
      start: addDateAndTime(startDate, meetup.startTime),
      end: addDateAndTime(endDate, allDay && endDate > startDate ? '24:00' : meetup.endTime),
      allDay,
      editable: true,
      extendedProps: { meetup },
      ...otherProps
    };
  }

  dailyEvents(meetup) {
    return [ ...Array(meetup.recurringNumber).keys() ].map(dayOffset => {
      const millisecondOffset = millisecondsToDay * dayOffset;
      return this.eventObject(meetup, meetup.startDate + millisecondOffset, meetup.endDate + millisecondOffset);
    });
  }

  weeklyEvents(meetup) {
    if (!Array.isArray(meetup.day) || meetup.day.length === 0 || meetup.recurringNumber === undefined) {
      return this.eventObject(meetup);
    }
    const events = [];
    let i = 0;
    while (events.length < meetup.recurringNumber) {
      const startDay = meetup.startDate + (i * millisecondsToDay);
      const date = new Date(startDay);
      if (meetup.day.includes(days[date.getDay()])) {
        events.push(this.eventObject(meetup, startDay, meetup.endDate + (i * millisecondsToDay)));
      }
      i++;
    }
    return events;
  }

  openAddEventDialog(event) {
    const today = new Date();
    const meetup = event?.start
    ? {
      startDate: event.start,
      endDate: this.adjustEndDate(event.end),
    }
  : {
      startDate: today,
      endDate: today,
    };
    this.dialog.open(DialogsAddMeetupsComponent, {
      data: { meetup: meetup, link: this.link, sync: this.sync, onMeetupsChange: this.onMeetupsChange.bind(this), editable: this.editable }
    });
  }

  adjustEndDate(endDate: Date): Date {
    return new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 1, 23, 59, 59, 999);
  }

  onMeetupsChange() {
    this.getMeetups();
  }

  eventClick({ event }) {
    const eventData = event.extendedProps.meetup;

    if (eventData.isTask) {
      this.openTaskDialog(eventData);
    } else {
      this.dialog.open(DialogsAddMeetupsComponent, {
        data: {
          meetup: eventData,
          view: 'view',
          link: this.link,
          sync: this.sync,
          editable: this.editable,
          onMeetupsChange: this.onMeetupsChange.bind(this)
        }
      });
    }
  }

  openTaskDialog(task) {
    this.dialog.open(DialogsAddMeetupsComponent, {
      data: {
        meetup: task,
        view: 'view',
        link: this.link,
        sync: this.sync,
        editable: this.editable,
        isTask: true,
        onEditTask: () => this.openTaskEditDialog(task),
        onDeleteTask: () => this.openTaskDeleteDialog(task)
      }
    });
  }

  openTaskEditDialog(task) {
    const { fields, formGroup } = this.tasksService.addDialogForm(task);
    this.dialogsFormService.openDialogsForm(task.title ? $localize`Edit Task` : $localize`Add Task`, fields, formGroup, {
      onSubmit: (newTask) => {
        if (newTask) {
          this.tasksService.addDialogSubmit({ link: this.link, sync: this.sync }, task, newTask, () => {
            this.getTasks();
            this.planetMessageService.showMessage($localize`Task updated successfully`);
            this.dialogsFormService.closeDialogsForm();
          });
        }
      },
      autoFocus: true
    });
  }

  openTaskDeleteDialog(task) {
    const dialogRef = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.tasksService.archiveTask(task)(),
          onNext: () => {
            this.getTasks();
            this.planetMessageService.showMessage($localize`Task deleted successfully`);
            dialogRef.close();
          },
          onError: () => {
            this.planetMessageService.showAlert($localize`There was an error deleting this task`);
            dialogRef.close();
          }
        },
        changeType: 'delete',
        type: 'task',
        displayName: task.title
      }
    });
  }
}
