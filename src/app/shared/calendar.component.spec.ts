import { vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { of } from 'rxjs';

import { PlanetCalendarComponent } from './calendar.component';
import { styleVariables } from './utils';

describe('PlanetCalendarComponent', () => {
  const createComponent = (couchService: any = {}, element = document.createElement('div')) => new PlanetCalendarComponent(
    document,
    'en',
    {} as any,
    couchService,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    new ElementRef(element),
    { runOutsideAngular: (fn: () => void) => fn() } as any
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

  it('re-measures the calendar once its container reports a width', () => {
    const updateSize = vi.fn();
    let notify: (entries: any[]) => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: (entries: any[]) => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    });
    const component = createComponent();
    component.calendar = { getApi: () => ({ updateSize }) };

    component.ngAfterViewInit();
    // ResizeObserver reports zero until the calendar has been laid out on screen
    notify([ { contentRect: { width: 0 } } ]);
    notify([ { contentRect: { width: 800 } } ]);

    expect(updateSize).toHaveBeenCalledTimes(2);

    // the calendar changes its own height, so an unchanged width should not re-measure
    notify([ { contentRect: { width: 800 } } ]);

    expect(updateSize).toHaveBeenCalledTimes(2);

    notify([ { contentRect: { width: 400 } } ]);

    expect(updateSize).toHaveBeenCalledTimes(3);
    component.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  it('survives a resize reported before the calendar has an api', () => {
    let notify: (entries: any[]) => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: (entries: any[]) => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    });
    const component = createComponent();
    component.calendar = { getApi: () => null };

    component.ngAfterViewInit();

    expect(() => notify([ { contentRect: { width: 800 } } ])).not.toThrow();
    component.ngOnDestroy();
    vi.unstubAllGlobals();
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
