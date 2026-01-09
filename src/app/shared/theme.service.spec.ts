import { OverlayContainer } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

type MatchMediaMock = MediaQueryList & { trigger: (matches: boolean) => void };

describe('ThemeService', () => {
  let overlayContainerElement: HTMLDivElement;
  let matchMediaMock: MatchMediaMock;

  const createMatchMedia = (matches: boolean): MatchMediaMock => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    const matcher: MatchMediaMock = {
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => { listener = callback; },
      removeEventListener: () => { listener = null; },
      addListener: (_: any) => {},
      removeListener: (_: any) => {},
      dispatchEvent: () => false,
      trigger: (value: boolean) => {
        matcher.matches = value;
        listener?.({ matches: value } as MediaQueryListEvent);
      }
    };
    return matcher;
  };

  beforeEach(() => {
    overlayContainerElement = document.createElement('div');
    matchMediaMock = createMatchMedia(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => matchMediaMock
    });
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: OverlayContainer, useValue: { getContainerElement: () => overlayContainerElement } },
        { provide: DOCUMENT, useValue: document }
      ]
    });
  });

  it('defaults to system preference when no user choice exists', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.activeTheme).toBe('dark');
    expect(document.body.classList.contains('planet-theme-dark')).toBeTrue();
  });

  it('persists explicit user preferences and toggles theme', () => {
    const service = TestBed.inject(ThemeService);

    service.setPreference('light');
    expect(service.activeTheme).toBe('light');
    expect(localStorage.getItem('planet-theme-preference')).toBe('light');

    service.toggleTheme();
    expect(service.activeTheme).toBe('dark');
    expect(localStorage.getItem('planet-theme-preference')).toBe('dark');
    expect(overlayContainerElement.classList.contains('planet-theme-dark')).toBeTrue();
  });

  it('reacts to system preference changes when using system setting', () => {
    const service = TestBed.inject(ThemeService);

    service.setPreference('system');
    matchMediaMock.trigger(false);
    expect(service.activeTheme).toBe('light');

    matchMediaMock.trigger(true);
    expect(service.activeTheme).toBe('dark');
  });
});
