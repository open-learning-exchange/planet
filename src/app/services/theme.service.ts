import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type ActiveTheme = 'light' | 'dark';
export type ThemePreference = ActiveTheme | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'planet-theme-preference';
  private readonly prefersDarkMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;
  private readonly themeSubject: BehaviorSubject<ActiveTheme>;
  private preference: ThemePreference;

  readonly themeChanges$: Observable<ActiveTheme>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const { activeTheme, preference } = this.resolveInitialState();
    this.preference = preference;
    this.themeSubject = new BehaviorSubject<ActiveTheme>(activeTheme);
    this.themeChanges$ = this.themeSubject.asObservable();

    this.applyTheme(activeTheme, preference);
    this.startSystemListener();
  }

  setPreference(preference: ThemePreference): void {
    this.preference = preference;
    this.persistPreference(preference);

    const nextTheme = this.determineActiveTheme(preference);
    this.themeSubject.next(nextTheme);
    this.applyTheme(nextTheme, preference);
  }

  getPreference(): ThemePreference {
    return this.preference;
  }

  getActiveTheme(): ActiveTheme {
    return this.themeSubject.getValue();
  }

  private resolveInitialState(): { activeTheme: ActiveTheme; preference: ThemePreference } {
    const storedPreference = this.readPreference();
    const preference = storedPreference ?? 'system';
    const activeTheme = this.determineActiveTheme(preference);

    return { activeTheme, preference };
  }

  private determineActiveTheme(preference: ThemePreference): ActiveTheme {
    if (preference === 'system') {
      return this.getSystemTheme();
    }

    return preference;
  }

  private applyTheme(theme: ActiveTheme, preference: ThemePreference): void {
    const classList = this.document.body.classList;
    classList.remove('theme-light', 'theme-dark');
    classList.add(`theme-${theme}`);

    this.document.body.dataset.themePreference = preference;
  }

  private readPreference(): ThemePreference | null {
    try {
      const storedPreference = localStorage.getItem(this.storageKey) as ThemePreference | null;
      if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
        return storedPreference;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private persistPreference(preference: ThemePreference): void {
    try {
      localStorage.setItem(this.storageKey, preference);
    } catch (error) {
      // Ignore write errors so the theme change can still occur.
    }
  }

  private startSystemListener(): void {
    if (!this.prefersDarkMediaQuery) {
      return;
    }

    this.prefersDarkMediaQuery.addEventListener('change', event => {
      if (this.preference !== 'system') {
        return;
      }

      const theme = event.matches ? 'dark' : 'light';
      this.themeSubject.next(theme);
      this.applyTheme(theme, 'system');
    });
  }

  private getSystemTheme(): ActiveTheme {
    if (this.prefersDarkMediaQuery) {
      return this.prefersDarkMediaQuery.matches ? 'dark' : 'light';
    }

    return 'light';
  }
}
