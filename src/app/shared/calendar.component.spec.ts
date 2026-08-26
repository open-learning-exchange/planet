import { of } from 'rxjs';
import { vi } from 'vitest';

import { PlanetCalendarComponent } from './calendar.component';

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
});
