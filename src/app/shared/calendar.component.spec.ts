import { of } from 'rxjs';
import { vi } from 'vitest';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent read-only behavior', () => {
  const createComponent = () => {
    const dialog = { open: vi.fn() };
    const authService = { checkAuthenticationStatus: vi.fn(() => of(undefined)) };
    const component = new PlanetCalendarComponent(
      { documentElement: { lang: 'en' } } as any,
      'en',
      dialog as any,
      {} as any,
      authService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    component.editable = false;

    return { authService, component, dialog };
  };

  it('does not open add-event flows when read-only', () => {
    const { authService, component, dialog } = createComponent();

    (component.calendarOptions.select as (event: any) => void)({ start: new Date() });
    component.openAddEventDialog({ start: new Date() });

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('uses the latest editable value when a date range is selected', () => {
    const { authService, component, dialog } = createComponent();
    const selection = { start: new Date('2026-01-01'), end: new Date('2026-01-02') };

    component.editable = true;
    (component.calendarOptions.select as (event: any) => void)(selection);

    expect(authService.checkAuthenticationStatus).toHaveBeenCalledOnce();
    expect(dialog.open).toHaveBeenCalledOnce();
  });

  it('does not authenticate from a stale add-event button after becoming read-only', () => {
    const { authService, component, dialog } = createComponent();
    component.editable = true;
    vi.spyOn(component, 'getMeetups').mockImplementation(() => undefined);
    vi.spyOn(component, 'getTasks').mockImplementation(() => undefined);
    component.ngOnInit();

    component.editable = false;
    (component.buttons as any).addEventButton.click({ start: new Date() });

    expect(authService.checkAuthenticationStatus).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});

describe('PlanetCalendarComponent', () => {
  const createComponent = (couchService: any = {}) => new PlanetCalendarComponent(
    document,
    'en',
    {} as any,
    couchService,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  it('preserves the time stored in a task deadline', () => {
    const component = createComponent();
    const deadline = new Date(2026, 7, 7, 15, 30).getTime();

    const event = component.eventObject({ title: 'Task', isTask: true }, deadline, deadline);

    expect(event.start.getTime()).toBe(deadline);
    expect(event.end).toBeUndefined();
    expect(event.allDay).toBe(false);
  });

  it('advances an all-day exclusive end by a local calendar day', () => {
    const component = createComponent();
    const startDate = new Date(2026, 9, 31);
    const endDate = new Date(2026, 10, 1);
    const expectedEnd = new Date(endDate);
    expectedEnd.setHours(0, 0, 0, 0);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    const event = component.eventObject({ title: 'Meetup' }, startDate, endDate);

    expect(event.end?.getTime()).toBe(expectedEnd.getTime());
    expect(event.end?.getHours()).toBe(0);
  });

  it('omits the end of a timed meetup when no end time is provided', () => {
    const component = createComponent();
    const date = new Date(2026, 7, 7);

    const event = component.eventObject({ title: 'Meetup', startTime: '09:30', endTime: '' }, date, date);

    expect(event.start.getHours()).toBe(9);
    expect(event.start.getMinutes()).toBe(30);
    expect(event.end).toBeUndefined();
    expect(event.allDay).toBe(false);
  });

  it('preserves a later end date for a multi-day timed meetup without an end time', () => {
    const component = createComponent();
    const startDate = new Date(2026, 7, 7);
    const endDate = new Date(2026, 7, 9);

    const event = component.eventObject({ title: 'Meetup', startTime: '09:30', endTime: '' }, startDate, endDate);

    expect(event.end?.getTime()).toBe(endDate.getTime());
    expect(event.end?.getHours()).toBe(0);
  });

  it('uses the task event colors for matching legend swatches', () => {
    const deadline = new Date(2026, 7, 7, 15, 30).getTime();
    const couchService = {
      findAll: () => of([
        { title: 'Open', deadline, completed: false },
        { title: 'Completed', deadline, completed: true }
      ])
    };
    const component = createComponent(couchService);

    component.getTasks();

    expect(component.tasks[0].backgroundColor).toBe(component.eventLegend[1].color);
    expect(component.tasks[1].backgroundColor).toBe(component.eventLegend[2].color);
    expect(component.tasks[0].textColor).toBe(styleVariables.accentText);
    expect(component.tasks[1].textColor).toBe(styleVariables.accentText);
  });
});
