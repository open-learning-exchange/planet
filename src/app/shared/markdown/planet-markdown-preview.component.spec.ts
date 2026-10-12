import { vi } from 'vitest';
import { NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StateService } from '@shared/state.service';

import { PlanetMarkdownPreviewComponent } from './planet-markdown-preview.component';

describe('PlanetMarkdownPreviewComponent', () => {
  let resize: () => void;

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    });
    await TestBed.configureTestingModule({
      imports: [ PlanetMarkdownPreviewComponent ],
      providers: [ { provide: StateService, useValue: { configuration: { parentDomain: 'parent.example' } } } ]
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  const render = (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(PlanetMarkdownPreviewComponent);
    Object.entries(inputs).forEach(([ name, value ]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    return fixture;
  };

  const toggle = (fixture: ComponentFixture<PlanetMarkdownPreviewComponent>): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.km-preview-toggle');

  const overflowPreview = (fixture: ComponentFixture<PlanetMarkdownPreviewComponent>) => {
    const preview = fixture.componentInstance.preview.nativeElement;
    Object.defineProperty(preview, 'clientHeight', { value: 144 });
    Object.defineProperty(preview, 'scrollHeight', { value: 200 });
  };

  it('shows the toggle only while the preview hides text or images', () => {
    const fixture = render({ content: 'Short description' });
    expect(toggle(fixture)).toBeNull();

    fixture.componentRef.setInput('content', 'Long description '.repeat(40));
    fixture.detectChanges();
    expect(toggle(fixture).getAttribute('aria-expanded')).toBe('false');

    fixture.componentRef.setInput('content', 'Short description\n\n![photo](resources/1/photo.png)');
    fixture.detectChanges();
    expect(toggle(fixture)).not.toBeNull();

    fixture.componentRef.setInput('content', 'Edited short description');
    fixture.detectChanges();
    expect(toggle(fixture)).toBeNull();
  });

  it('shows the toggle once a resize reported outside the zone overflows the preview', async () => {
    const fixture = render({ content: 'Short description' });
    fixture.autoDetectChanges();
    overflowPreview(fixture);

    TestBed.inject(NgZone).runOutsideAngular(() => resize());
    await fixture.whenStable();

    expect(toggle(fixture)).not.toBeNull();
  });

  it('measures the preview again after its content changes', async () => {
    const fixture = render({ content: 'Short description' });
    fixture.autoDetectChanges();
    overflowPreview(fixture);

    fixture.componentRef.setInput('content', 'Edited description');
    await fixture.whenStable();

    expect(toggle(fixture)).not.toBeNull();
  });

  it('keeps the same toggle when a preview rendered expanded collapses', async () => {
    const fixture = render({ content: 'Short description', expanded: true });
    fixture.autoDetectChanges();
    overflowPreview(fixture);
    const emitted = vi.fn();
    fixture.componentInstance.expandedChange.subscribe(emitted);
    const button = toggle(fixture);

    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    expect(emitted).toHaveBeenCalledWith(false);

    fixture.componentRef.setInput('expanded', false);
    await fixture.whenStable();

    expect(toggle(fixture)).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
