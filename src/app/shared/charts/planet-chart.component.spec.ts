import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { loadChart } from './chart.utils';
import { PlanetChartComponent } from './planet-chart.component';

vi.mock('./chart.utils', () => ({ loadChart: vi.fn() }));

class FakeChart {
  static instances: FakeChart[] = [];
  destroy = vi.fn();
  update = vi.fn();
  data: any;
  options: any;

  constructor(public canvas: HTMLCanvasElement, public config: any) {
    FakeChart.instances.push(this);
  }
}

// jsdom has no IntersectionObserver, so @defer's viewport trigger gets one the test can fire
let scrollIntoView: () => void;
class FakeIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    scrollIntoView = () => this.callback([ { isIntersecting: true, target } as IntersectionObserverEntry ], this as any);
  }
  unobserve() {}
  disconnect() {}
}

@Component({
  template: '<planet-chart chartId="test-chart" [labels]="labels" [datasets]="datasets"></planet-chart>',
  imports: [ PlanetChartComponent ]
})
class HostComponent {
  labels = [ 'A', 'B' ];
  datasets: any[] = [ { data: [ 1, 2 ] } ];
}

describe('PlanetChartComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const canvas = () => fixture.nativeElement.querySelector('canvas');
  const render = async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  // Zone.js can't track native await, so whenStable can settle before Chart.js is constructed
  const renderInView = async () => {
    await render();
    scrollIntoView();
    await vi.waitFor(() => expect(FakeChart.instances.length).toBe(1));
  };

  beforeEach(() => {
    FakeChart.instances = [];
    vi.mocked(loadChart).mockReset().mockResolvedValue({ Chart: FakeChart } as any);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    TestBed.configureTestingModule({
      imports: [ HostComponent ],
      providers: [ { provide: PlanetMessageService, useValue: {} } ]
    });
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the empty message and never loads Chart.js when every value is zero', async () => {
    fixture.componentInstance.datasets = [ { data: [ 0, 0 ] } ];
    await render();

    expect(loadChart).not.toHaveBeenCalled();
    expect(canvas()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No data available');
  });

  it('waits until the chart scrolls into view before loading Chart.js', async () => {
    await render();

    expect(loadChart).not.toHaveBeenCalled();
    expect(canvas()).toBeNull();

    scrollIntoView();
    await vi.waitFor(() => expect(FakeChart.instances.length).toBe(1));

    expect(loadChart).toHaveBeenCalledTimes(1);
    expect(FakeChart.instances[0].canvas).toBe(canvas());
  });

  it('updates the drawn chart in place when its data changes', async () => {
    await renderInView();

    fixture.componentInstance.datasets = [ { data: [ 5, 6 ] } ];
    fixture.detectChanges();
    await vi.waitFor(() => expect(FakeChart.instances[0].update).toHaveBeenCalledWith('none'));

    expect(FakeChart.instances.length).toBe(1);
    expect(FakeChart.instances[0].data.datasets[0].data).toEqual([ 5, 6 ]);
  });

  it('destroys the chart when it is removed', async () => {
    await renderInView();

    fixture.destroy();

    expect(FakeChart.instances[0].destroy).toHaveBeenCalled();
  });
});
