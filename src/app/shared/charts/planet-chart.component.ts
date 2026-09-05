import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnChanges,
  OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import type { Chart, ChartConfiguration, ChartDataset, ChartType } from 'chart.js';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { loadChart } from '../chart-utils';
import { PlanetMessageService } from '../planet-message.service';
import { chartPalette } from './chart-palette';

type Registerable = Parameters<typeof loadChart>[0][number];

const registerablesByType: { [key: string]: Registerable[] } = {
  bar: [ 'BarController', 'BarElement', 'CategoryScale', 'LinearScale' ],
  line: [ 'LineController', 'LineElement', 'PointElement', 'CategoryScale', 'LinearScale' ],
  pie: [ 'DoughnutController', 'ArcElement' ],
  doughnut: [ 'DoughnutController', 'ArcElement' ]
};

const commonRegisterables: Registerable[] = [ 'Title', 'Legend', 'Tooltip' ];

@Component({
  selector: 'planet-chart',
  templateUrl: './planet-chart.component.html',
  styleUrls: [ './planet-chart.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip ]
})
export class PlanetChartComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() chartId: string;
  @Input() title = '';
  @Input() type: ChartType = 'bar';
  @Input() labels: unknown[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() options: ChartConfiguration['options'] = {};
  @Input() height = 320;
  @Input() emptyMessage = $localize`No data available`;
  @Input() showActions = true;
  /* Charts render only once scrolled into view. Set eager for a chart that is always above the fold. */
  @Input() eager = false;

  @ViewChild('canvas') canvasRef: ElementRef<HTMLCanvasElement>;

  chart: Chart;
  isVisible = false;
  private observer: IntersectionObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
    private planetMessageService: PlanetMessageService
  ) {}

  /*
   * Nothing is drawn — and Chart.js is never fetched — until there is at least one non-zero value.
   * Community servers run on Raspberry Pis, so an empty chart should cost nothing.
   */
  get hasData(): boolean {
    return (this.datasets || []).some(dataset => (Array.isArray(dataset.data) ? dataset.data : [])
      .some(point => this.pointValue(point) !== 0));
  }

  ngAfterViewInit() {
    if (this.eager || typeof IntersectionObserver === 'undefined') {
      this.isVisible = true;
      this.changeDetectorRef.markForCheck();
      this.renderChart();
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some(entry => entry.isIntersecting)) {
          return;
        }
        this.disconnectObserver();
        this.zone.run(() => {
          this.isVisible = true;
          this.changeDetectorRef.markForCheck();
          this.renderChart();
        });
      }, { rootMargin: '100px' });
      this.observer.observe(this.host.nativeElement);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isVisible && (changes.labels || changes.datasets || changes.type || changes.options)) {
      this.renderChart();
    }
  }

  ngOnDestroy() {
    this.disconnectObserver();
    this.destroyChart();
  }

  private disconnectObserver() {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private pointValue(point: any): number {
    if (point && typeof point === 'object') {
      const value = point.y ?? point.v;
      return typeof value === 'number' ? value : 0;
    }
    return typeof point === 'number' ? point : 0;
  }

  private async renderChart() {
    if (!this.hasData) {
      this.destroyChart();
      this.changeDetectorRef.markForCheck();
      return;
    }
    const { Chart: ChartJs } = await loadChart(this.requiredRegisterables());
    this.changeDetectorRef.detectChanges();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    const data = { labels: this.labels, datasets: this.datasets };
    if (this.chart) {
      this.chart.data = data as any;
      this.chart.options = this.chartOptions();
      this.chart.update('none');
      return;
    }
    /* Chart.js binds listeners per instance, so keep construction off the Angular zone. */
    this.zone.runOutsideAngular(() => {
      this.chart = new ChartJs(canvas, { type: this.type, data, options: this.chartOptions() } as ChartConfiguration);
    });
  }

  /* Mixed charts (a line over bars, say) need the controllers for every dataset type, not just the chart type. */
  private requiredRegisterables(): Registerable[] {
    const types = [ this.type, ...(this.datasets || []).map((dataset: any) => dataset.type).filter(Boolean) ];
    const keys = types.reduce(
      (collected: Registerable[], type: string) => collected.concat(registerablesByType[type] || registerablesByType.bar),
      [ ...commonRegisterables ]
    );
    return Array.from(new Set(keys));
  }

  private chartOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      /* Animations and high-DPI backing stores are the two costliest knobs on low-power hardware. */
      animation: false,
      devicePixelRatio: Math.min(typeof window === 'undefined' ? 1 : (window.devicePixelRatio || 1), 2),
      plugins: {
        title: { display: !!this.title, text: this.title, font: { size: 16 }, color: chartPalette.greyText },
        legend: { position: 'bottom' }
      },
      ...(registerablesByType[this.type] === registerablesByType.pie ? {} : {
        scales: { x: { type: 'category' }, y: { type: 'linear', beginAtZero: true, ticks: { precision: 0 } } }
      }),
      ...this.options
    } as ChartConfiguration['options'];
  }

  private toCanvasWithBackground(): HTMLCanvasElement {
    const source = this.chart.canvas;
    const target = document.createElement('canvas');
    target.width = source.width;
    target.height = source.height;
    const context = target.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(source, 0, 0);
    return target;
  }

  downloadChart() {
    if (!this.chart) {
      return;
    }
    const link = document.createElement('a');
    link.download = `${this.chartId || 'chart'}.png`;
    link.href = this.toCanvasWithBackground().toDataURL('image/png');
    link.click();
  }

  async copyChart() {
    if (!this.chart) {
      return;
    }
    const blob = await new Promise<Blob>(resolve => this.toCanvasWithBackground().toBlob(resolve, 'image/png'));
    try {
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      this.planetMessageService.showMessage($localize`Chart copied to clipboard`);
    } catch {
      this.planetMessageService.showAlert($localize`Failed to copy chart to clipboard`);
    }
  }

}
