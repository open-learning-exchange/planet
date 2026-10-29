import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { PlanetChartComponent } from './planet-chart.component';

const { FakeChart } = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];
    static register = vi.fn();
    destroy = vi.fn();
    update = vi.fn();
    data: any;
    options: any;

    constructor(public canvas: HTMLCanvasElement, public config: any) {
      Chart.instances.push(this);
    }
  }
  return { FakeChart: Chart };
});

// Angular's test builder only lets vi.mock replace packages, so Chart.js itself is faked
vi.mock('chart.js', () => ({
  Chart: FakeChart, Legend: {}, Tooltip: {}, BarController: {}, BarElement: {}, CategoryScale: {}, LinearScale: {}
}));

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
  // A pending Chart.js import isn't a Zone.js task, so whenStable can settle before the chart is constructed
  const renderInView = async () => {
    await render();
    scrollIntoView();
    await vi.waitFor(() => expect(FakeChart.instances.length).toBe(1));
  };

  beforeEach(() => {
    FakeChart.instances = [];
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

  it('shows the empty message instead of a chart when every value is zero', async () => {
    fixture.componentInstance.datasets = [ { data: [ 0, 0 ] } ];
    await render();

    expect(canvas()).toBeNull();
    expect(FakeChart.instances.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No data available');
  });

  it('waits until the chart scrolls into view before drawing it', async () => {
    await render();

    expect(canvas()).toBeNull();
    expect(FakeChart.instances.length).toBe(0);

    scrollIntoView();
    await vi.waitFor(() => expect(FakeChart.instances.length).toBe(1));

    expect(FakeChart.instances[0].canvas).toBe(canvas());
  });

  it('updates the drawn chart in place when its data changes', async () => {
    await renderInView();

    fixture.componentInstance.datasets = [ { data: [ 5, 6 ] } ];
    fixture.detectChanges();
    await vi.waitFor(() => expect(FakeChart.instances[0].data?.datasets[0].data).toEqual([ 5, 6 ]));

    expect(FakeChart.instances.length).toBe(1);
    expect(FakeChart.instances[0].update).toHaveBeenLastCalledWith('none');
  });

  it('destroys the chart when it is removed', async () => {
    await renderInView();

    fixture.destroy();

    expect(FakeChart.instances[0].destroy).toHaveBeenCalled();
  });
});
