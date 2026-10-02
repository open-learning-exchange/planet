import { AfterViewInit, Component, ElementRef, Inject, Input, LOCALE_ID, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { MeetupService } from '../meetups/meetups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatTooltip } from '@angular/material/tooltip';

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
        @for (legend of eventLegend; track legend.key) {
          @if (!legend.type || legend.type === type) {
            @if (type === 'team') {
              <button type="button" class="legend-item legend-toggle" [class.legend-item-disabled]="!activeFilters.has(legend.key)"
                [attr.aria-pressed]="activeFilters.has(legend.key)"
                [matTooltip]="activeFilters.has(legend.key) ? legend.hideTooltip : legend.showTooltip"
                (click)="toggleFilter(legend.key)">
                <span class="legend-color" [style.backgroundColor]="legend.color"></span>
                <span>{{ legend.label }}</span>
              </button>
            } @else {
              <div class="legend-item">
                <div class="legend-color" [style.backgroundColor]="legend.color"></div>
                <span>{{ legend.label }}</span>
              </div>
            }
          }
        }
      </div>
    }
    `,
  imports: [FullCalendarModule, MatTooltip]
})
export class PlanetCalendarComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('calendar') calendar: any;
  @Input() link: any = {};
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  @Input() leaderOfTeamId?: string;
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
  activeFilters: Set<string> = new Set(['event', 'uncompleted', 'completed']);
  eventLegend = [
    {
      key: 'event',
      color: styleVariables.primary,
      label: $localize`Event`,
      showTooltip: $localize`Show Events`,
      hideTooltip: $localize`Hide Events`
    },
    {
      key: 'uncompleted',
      color: taskEventColors.uncompleted.backgroundColor,
      label: $localize`Uncompleted Task`,
      type: 'team',
      showTooltip: $localize`Show Uncompleted Tasks`,
      hideTooltip: $localize`Hide Uncompleted Tasks`
    },
    {
      key: 'completed',
      color: taskEventColors.completed.backgroundColor,
      label: $localize`Completed Task`,
      type: 'team',
      showTooltip: $localize`Show Completed Tasks`,
      hideTooltip: $localize`Hide Completed Tasks`
    }
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
      if (!this.editable) {
        return;
      }
      this.authService.checkAuthenticationStatus().subscribe(() => this.openAddEventDialog(arg));
    },
    eventClick: this.eventClick.bind(this),
    eventDurationEditable: false,
    eventDrop: this.eventDrop.bind(this)
  };

  private resizeObserver: ResizeObserver | null = null;
  private resizeFrameId: number | null = null;
  private calendarWidth: number;

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
    private elementRef: ElementRef<HTMLElement>,
    private ngZone: NgZone,
    private meetupService: MeetupService,
    private notificationsService: NotificationsService
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
            if (!this.editable) {
              return;
            }
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

  ngAfterViewInit() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(entries => this.onCalendarResize(entries[0]?.contentRect.width));
      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId);
    }
  }

  private onCalendarResize(width?: number) {
    if (!width || width === this.calendarWidth) {
      return;
    }
    this.calendarWidth = width;
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId);
    }
    this.resizeFrameId = requestAnimationFrame(() => {
      this.calendar?.getApi()?.updateSize();
      this.resizeFrameId = null;
    });
  }

  toggleFilter(key: string) {
    if (this.activeFilters.has(key)) {
      this.activeFilters.delete(key);
    } else {
      this.activeFilters.add(key);
    }
    this.updateVisibleEvents();
  }

  updateVisibleEvents() {
    const visible = [
      ...(this.activeFilters.has('event') ? this.meetups : []),
      ...this.tasks.filter(task => this.activeFilters.has(task.extendedProps.meetup.completed ? 'completed' : 'uncompleted'))
    ];
    this.events = visible.length > 0 ? visible : [ {} ];
    this.calendarOptions.events = this.events;
  }

  getMeetups() {
    this.fetchMeetups().subscribe();
  }

  private fetchMeetups() {
    return this.couchService.findAll(this.dbName, findDocuments({ link: this.link })).pipe(tap((meetups: any[]) => {
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
      this.updateVisibleEvents();
    }));
  }

  getTasks() {
    this.fetchTasks().subscribe();
  }

  private fetchTasks() {
    return this.couchService.findAll('tasks', findDocuments({ link: this.link })).pipe(tap((tasks: any[]) => {
      this.tasks = tasks.filter(task => task.status !== 'archived').map(task => {
        const taskColors = task.completed ? taskEventColors.completed : taskEventColors.uncompleted;
        return this.eventObject({ ...task, isTask: true }, task.deadline, task.deadline, taskColors);
      });
      this.updateVisibleEvents();
    }));
  }

  canEditMeetup(meetup: any): boolean {
    return this.meetupService.canEditMeetup(meetup, { leaderOfTeamId: this.leaderOfTeamId, readOnly: !this.editable });
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
      : (this.canEditMeetup(meetup) && !isRecurring);

    return {
      title: meetup.title,
      start,
      ...(end ? { end } : {}),
      allDay,
      startEditable: editable,
      // A bare editable would expand to durationEditable too, and resizing has no persistence path
      durationEditable: false,
      classNames: [ 'cursor-pointer' ],
      extendedProps: { meetup },
      ...otherProps
    };
  }

  // Whole calendar days, not milliseconds, so a span survives a daylight saving transition
  private shiftStoredDate(dateValue, delta: any): number {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + (delta?.days || 0));
    return date.getTime() + (delta?.milliseconds || 0);
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
    if (!this.editable) {
      return;
    }
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
      data: {
        meetup,
        link: this.link,
        sync: this.sync,
        onMeetupsChange: this.onMeetupsChange.bind(this),
        editable: this.editable,
        leaderOfTeamId: this.leaderOfTeamId
      },
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
          leaderOfTeamId: this.leaderOfTeamId,
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
    if (!this.editable) {
      return;
    }
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
    if (!this.editable) {
      return;
    }
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

  // A failed refetch leaves these caches in place and the next refresh rebuilds the calendar from them
  private replaceCachedEvent(info: any, event: any) {
    const { meetup } = event.extendedProps;
    info.event.setExtendedProp('meetup', meetup);
    const replace = (cache: any[]) => cache.map(cached => cached.extendedProps?.meetup?._id === meetup._id ? event : cached);
    this.meetups = meetup.isTask ? this.meetups : replace(this.meetups);
    this.tasks = meetup.isTask ? replace(this.tasks) : this.tasks;
    this.updateVisibleEvents();
  }

  eventDrop(info: any) {
    const eventData = info.event?.extendedProps?.meetup;
    if (!eventData || !info.event?.start) {
      info.revert();
      return;
    }

    if (eventData.isTask) {
      if (!this.editable) {
        info.revert();
        this.planetMessageService.showAlert($localize`You are not authorized to edit this task`);
        return;
      }
      const { isTask, ...taskDoc } = eventData;
      const updatedTask = { ...taskDoc, deadline: info.event.start.getTime() };

      this.dialogsLoadingService.start();
      this.tasksService.addTask(updatedTask).pipe(
        tap((res: any) => {
          const storedTask = { ...res.doc, isTask: true };
          const taskColors = storedTask.completed ? taskEventColors.completed : taskEventColors.uncompleted;
          this.replaceCachedEvent(info, this.eventObject(storedTask, storedTask.deadline, storedTask.deadline, taskColors));
        }),
        switchMap(() => this.fetchTasks().pipe(catchError(() => of([])))),
        finalize(() => this.dialogsLoadingService.stop())
      ).subscribe({
        next: () => {
          this.planetMessageService.showMessage($localize`Task rescheduled successfully`);
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

    const updatedMeetup = {
      ...eventData,
      startDate: this.shiftStoredDate(eventData.startDate, info.delta),
      ...(eventData.endDate ? { endDate: this.shiftStoredDate(eventData.endDate, info.delta) } : {})
    };

    this.dialogsLoadingService.start();
    this.couchService.updateDocument(this.dbName, updatedMeetup).pipe(
      tap((res: any) => this.replaceCachedEvent(info, this.eventObject(res.doc))),
      switchMap(() => this.notificationsService.notifyMeetupChange(updatedMeetup, updatedMeetup._id).pipe(catchError((err) => {
        console.error('Failed to notify meetup participants', err);
        return of(null);
      }))),
      switchMap(() => this.fetchMeetups().pipe(catchError(() => of([])))),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe({
      next: () => {
        this.planetMessageService.showMessage($localize`Event rescheduled: ${eventData.title}`);
      },
      error: (err) => {
        console.error(err);
        info.revert();
        this.planetMessageService.showAlert($localize`Failed to reschedule event`);
      }
    });
  }
}
