import { vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { of } from 'rxjs';
import { PlanetMarkdownTextboxComponent } from './planet-markdown-textbox.component';

describe('PlanetMarkdownTextboxComponent fullscreen layout', () => {
  let component: PlanetMarkdownTextboxComponent | undefined;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    component?.ngOnDestroy();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  function setupComponent(markup: string) {
    document.body.innerHTML = markup;
    document.querySelectorAll<HTMLElement>(
      '.mat-mdc-dialog-actions, .actions-container, .exam-buttons, .action-buttons, div.action-button'
    ).forEach(element => vi.spyOn(element, 'getClientRects').mockReturnValue([ {} as DOMRect ]));

    const host = document.querySelector<HTMLElement>('planet-markdown-textbox');
    return new PlanetMarkdownTextboxComponent(
      null,
      {
        monitor: vi.fn().mockReturnValue(of(null)),
        stopMonitoring: vi.fn()
      } as any,
      new ElementRef(host),
      {} as any,
      { runOutsideAngular: (callback: () => void) => callback() } as any
    );
  }

  it('pins the owning action row without selecting nested controls', () => {
    component = setupComponent(`
      <form>
        <div class="exam-buttons"></div>
        <mat-accordion>
          <planet-markdown-textbox></planet-markdown-textbox>
        </mat-accordion>
        <planet-step-list>
          <div class="action-buttons"></div>
        </planet-step-list>
      </form>
    `);
    const examActions = document.querySelector<HTMLElement>('.exam-buttons');
    const stepActions = document.querySelector<HTMLElement>('.action-buttons');

    component.options.onToggleFullScreen(true);

    expect(examActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(true);
    expect(stepActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(false);
  });

  it('finds dialog actions through Material wrapper elements', () => {
    component = setupComponent(`
      <mat-dialog-container class="mat-mdc-dialog-container">
        <div class="mat-mdc-dialog-inner-container">
          <div class="mat-mdc-dialog-surface">
            <form>
              <mat-dialog-content>
                <planet-markdown-textbox></planet-markdown-textbox>
              </mat-dialog-content>
              <mat-dialog-actions class="mat-mdc-dialog-actions"></mat-dialog-actions>
            </form>
          </div>
        </div>
      </mat-dialog-container>
    `);
    const dialogActions = document.querySelector<HTMLElement>('.mat-mdc-dialog-actions');

    component.options.onToggleFullScreen(true);

    expect(dialogActions.classList.contains('planet-markdown-fullscreen-actions')).toBe(true);
  });

  it('restores the marked elements when fullscreen ends', () => {
    component = setupComponent(`
      <form>
        <div class="mat-mdc-form-field">
          <planet-markdown-textbox></planet-markdown-textbox>
        </div>
        <div class="action-buttons"></div>
      </form>
    `);
    const owner = document.querySelector<HTMLElement>('form');
    const formField = document.querySelector<HTMLElement>('.mat-mdc-form-field');
    const actions = document.querySelector<HTMLElement>('.action-buttons');
    const host = document.querySelector<HTMLElement>('planet-markdown-textbox');

    component.options.onToggleFullScreen(true);
    expect(formField.classList.contains('planet-markdown-fullscreen-field')).toBe(true);

    component.options.onToggleFullScreen(false);

    expect(owner.classList.contains('planet-markdown-fullscreen-owner')).toBe(false);
    expect(owner.style.getPropertyValue('--fullscreen-actions-height')).toBe('');
    expect(formField.classList.contains('planet-markdown-fullscreen-field')).toBe(false);
    expect(actions.classList.contains('planet-markdown-fullscreen-actions')).toBe(false);
    expect(host.classList.contains('planet-markdown-fullscreen-host')).toBe(false);
  });
});
