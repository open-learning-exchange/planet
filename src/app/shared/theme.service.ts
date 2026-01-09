import { DOCUMENT } from '@angular/common';
import { Injectable, Inject, OnDestroy } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject } from 'rxjs';

type ThemePreference = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private static readonly STORAGE_KEY = 'planet-theme-preference';
  private readonly darkModeQuery: MediaQueryList = typeof window !== 'undefined' && window.matchMedia ?
    window.matchMedia('(prefers-color-scheme: dark)') :
    {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    } as MediaQueryList;
  private readonly preference$ = new BehaviorSubject<ThemePreference>('system');
  private readonly activeThemeSubject$ = new BehaviorSubject<ActiveTheme>('light');
  private readonly mediaListener = (event: MediaQueryListEvent) => {
    if (this.preference$.value === 'system') {
      this.applyResolvedTheme(event.matches ? 'dark' : 'light');
    }
  };

  readonly activeTheme$ = this.activeThemeSubject$.asObservable();
  readonly themePreference$ = this.preference$.asObservable();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private overlayContainer: OverlayContainer
  ) {
    const storedPreference = this.readStoredPreference();
    if (storedPreference) {
      this.preference$.next(storedPreference);
    }
    this.applyResolvedTheme(this.resolveTheme(this.preference$.value));
    this.darkModeQuery.addEventListener('change', this.mediaListener);
  }

  ngOnDestroy(): void {
    this.darkModeQuery.removeEventListener('change', this.mediaListener);
  }

  get activeTheme(): ActiveTheme {
    return this.activeThemeSubject$.value;
  }

  toggleTheme(): ActiveTheme {
    const nextTheme: ThemePreference = this.activeThemeSubject$.value === 'dark' ? 'light' : 'dark';
    this.setPreference(nextTheme);
    return this.activeThemeSubject$.value;
  }

  setPreference(preference: ThemePreference): void {
    this.preference$.next(preference);
    this.persistPreference(preference);
    this.applyResolvedTheme(this.resolveTheme(preference));
  }

  private resolveTheme(preference: ThemePreference): ActiveTheme {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }
    return this.darkModeQuery.matches ? 'dark' : 'light';
  }

  private applyResolvedTheme(theme: ActiveTheme): void {
    this.activeThemeSubject$.next(theme);
    const themeClass = `planet-theme-${theme}`;
    this.updateClassList(this.document.body.classList, themeClass);
    this.updateClassList(this.overlayContainer.getContainerElement().classList, themeClass);
  }

  private updateClassList(classList: DOMTokenList, themeClass: string): void {
    classList.remove('planet-theme-light', 'planet-theme-dark');
    classList.add(themeClass);
  }

  private readStoredPreference(): ThemePreference | null {
    try {
      const storedValue = localStorage.getItem(ThemeService.STORAGE_KEY) as ThemePreference | null;
      return storedValue === 'light' || storedValue === 'dark' || storedValue === 'system' ? storedValue : null;
    } catch {
      return null;
    }
  }

  private persistPreference(preference: ThemePreference): void {
    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, preference);
    } catch {
      // Ignore persistence errors (e.g. storage disabled)
    }
  }
}
