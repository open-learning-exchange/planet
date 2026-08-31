import { Component, Inject, Input, LOCALE_ID, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import allLocales from '@fullcalendar/core/locales-all';
import { MatDialog } from '@angular/material/dialog';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { DialogsPromptComponent } from './dialogs/dialogs-prompt.component';
import { days, millisecondsToDay } from '../meetups/constants';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';
import { styleVariables } from './utils';
import { AuthService } from './auth-guard.service';
import { TasksService } from '../tasks/tasks.service';
import { DialogsFormService } from './dialogs/dialogs-form.service';
import { PlanetMessageService } from './planet-message.service';
import { DialogsLoadingService } from './dialogs/dialogs-loading.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { UserService } from './user.service';

const taskEventColors = {
  completed: {
    backgroundColor: styleVariables.grey,
    borderColor: styleVariables.grey,
    textColor: styleVariables.accentText
  },
  uncompleted: {
    backgroundColor: styleVariables.accent,
    borderColor: styleVariables.accent,
    textColor: styleVariables.accentText
  }
};

@Component({
  selector: 'planet-calendar',
  styleUrls: ['./calendar.component.scss'],
  template: `
    <full-calendar #calendar [options]="calendarOptions"></full-calendar>
    @if (showLegend) {
      <div class="calendar-legend">
        @for (legend of eventLegend; track legend) {
          @if (!legend.type || legend.type === type) {
            <div class="legend-item">
              <div class="legend-color" [style.backgroundColor]="legend.color"></div>
              <span>{{ legend.label }}</span>
            </div>
          }
        }
      </div>
    }
    `,
  imports: [FullCalendarModule]
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
    { color: styleVariables.primary, label: $localize`Event` },
    { color: taskEventColors.uncompleted.backgroundColor, label: $localize`Uncompleted Task`, type: 'team' },
    { color: taskEventColors.completed.backgroundColor, label: $localize`Completed Task`, type: 'team' }
  ];

  calendarOptions: CalendarOptions = {
    plugins: [
      dayGridPlugin,
      interactionPlugin
    ],
    initialView: 'dayGridMonth',
    eventDisplay: 'block',
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
    eventClick: this.eventClick.bind(this),
    eventDrop: this.eventDrop.bind(this)
  };

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(LOCALE_ID) private localeId: string,
    private dialog: MatDialog,
    private couchService: CouchService,
    private authService: AuthService,
    private tasksService: TasksService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.calendarOptions.locale = this.localeId;
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
    this.calendarOptions.events = [ ...this.events ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.resizeCalendar && changes.resizeCalendar.currentValue) {
      this.calendar.getApi().updateSize();
      this.resizeCalendar = false;
    }
    this.calendarOptions.events = [ ...this.events ];
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
        const taskColors = task.completed ? taskEventColors.completed : taskEventColors.uncompleted;
        return this.eventObject({ ...task, isTask: true }, task.deadline, task.deadline, taskColors);
      });
      this.events = [ ...this.meetups, ...this.tasks ];
      this.calendarOptions.events = this.events;
    });
  }

  canEditMeetup(meetup: any): boolean {
    const user = this.userService.get();
    return !!user?._id && (user.isUserAdmin || user.name === meetup?.createdBy);
  }

  eventObject(
    meetup,
    startDate = meetup.startDate,
    endDate = meetup.endDate || startDate,
    otherProps: any = {
      backgroundColor: styleVariables.primary, borderColor: styleVariables.primary, textColor: styleVariables.primaryText
    }
  ) {
    const allDay = !meetup.isTask && (meetup.startTime === undefined || meetup.startTime === '' || meetup.startTime === null);
    const start = meetup.isTask ? new Date(startDate) : this.dateAtTime(startDate, meetup.startTime);
    let end: Date | undefined;

    if (allDay) {
      end = this.dateAtTime(endDate);
      end.setDate(end.getDate() + 1);
    } else if (!meetup.isTask) {
      const timedEnd = this.dateAtTime(endDate, meetup.endTime);
      end = timedEnd > start ? timedEnd : undefined;
    }

    const isRecurring = meetup.recurring && meetup.recurring !== 'none';
    const editable = meetup.isTask
      ? this.editable
      : (this.canEditMeetup(meetup) && !isRecurring && this.editable);

    return {
      title: meetup.title,
      start,
      ...(end ? { end } : {}),
      allDay,
      editable,
      extendedProps: { meetup },
      ...otherProps
    };
  }

  private dateAtTime(dateValue, time?: string): Date {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    if (time) {
      const [ hours, minutes ] = time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
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
      data: { meetup, link: this.link, sync: this.sync, onMeetupsChange: this.onMeetupsChange.bind(this), editable: this.editable },
      panelClass: 'fit-screen-dialog',
      maxHeight: '90vh'
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
        onMeetupsChange: () => this.getTasks(),
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

  eventDrop(info: any) {
    const eventData = info.event?.extendedProps?.meetup;
    if (!eventData) {
      info.revert();
      return;
    }

    if (eventData.isTask) {
      if (!this.editable) {
        info.revert();
        this.planetMessageService.showAlert($localize`You are not authorized to edit this task`);
        return;
      }
      const newDeadline = info.event.start ? info.event.start.getTime() : eventData.deadline;
      const { isTask, ...taskDoc } = eventData;
      const updatedTask = { ...taskDoc, deadline: newDeadline };

      this.couchService.updateDocument('tasks', updatedTask).subscribe({
        next: () => {
          this.planetMessageService.showMessage($localize`Task rescheduled successfully`);
          this.getTasks();
        },
        error: (err) => {
          console.error(err);
          info.revert();
          this.planetMessageService.showAlert($localize`Failed to reschedule task`);
        }
      });
      return;
    }

    if (!this.canEditMeetup(eventData)) {
      info.revert();
      this.planetMessageService.showAlert($localize`You are not authorized to edit this meetup`);
      return;
    }

    if (eventData.recurring && eventData.recurring !== 'none') {
      info.revert();
      this.planetMessageService.showAlert($localize`Recurring meetups cannot be rescheduled by dragging. Please edit the meetup schedule.`);
      return;
    }

    const deltaMs = (info.event.start?.getTime() ?? 0) - (info.oldEvent?.start?.getTime() ?? 0);
    const newStartDate = Number(eventData.startDate) + deltaMs;
    const newEndDate = eventData.endDate ? Number(eventData.endDate) + deltaMs : newStartDate;

    const updatedMeetup = {
      ...eventData,
      startDate: newStartDate,
      endDate: newEndDate
    };

    this.couchService.updateDocument(this.dbName, updatedMeetup).subscribe({
      next: () => {
        this.planetMessageService.showMessage($localize`Event rescheduled: ${eventData.title}`);
        this.getMeetups();
      },
      error: (err) => {
        console.error(err);
        info.revert();
        this.planetMessageService.showAlert($localize`Failed to reschedule event`);
      }
    });
  }
}
