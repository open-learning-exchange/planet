import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { Chart, ChartConfiguration, ChartDataset, ChartOptions } from 'chart.js';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { formatDate, styleVariables } from '@shared/utils';
import { loadChart, RegisterableKey } from './chart.utils';

export type PlanetChartType = 'bar' | 'doughnut';

const registerablesByType: Record<PlanetChartType, RegisterableKey[]> = {
  bar: [ 'BarController', 'BarElement', 'CategoryScale', 'LinearScale' ],
  doughnut: [ 'DoughnutController', 'ArcElement' ]
};

@Component({
  selector: 'planet-chart',
  templateUrl: './planet-chart.component.html',
  styleUrls: [ './planet-chart.component.scss' ],
  imports: [ MatIconButton, MatIcon, MatTooltip ]
})
export class PlanetChartComponent implements OnChanges, OnDestroy {

  @Input() chartId: string;
  @Input() type: PlanetChartType = 'bar';
  @Input() labels: string[] = [];
  @Input() datasets: ChartDataset[] = [];
  @Input() options: ChartOptions = {};
  @ViewChild('canvas') set canvas(canvas: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvasElement = canvas?.nativeElement;
    this.renderChart();
  }
  chart: Chart;
  // The Clipboard API only exists in secure contexts, and community servers serve plain HTTP
  canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  private canvasElement: HTMLCanvasElement;

  constructor(
    private ngZone: NgZone,
    private planetMessageService: PlanetMessageService
  ) {}

  get hasData() {
    return this.datasets.some(dataset => (dataset.data as number[]).some(value => !!value));
  }

  ngOnChanges() {
    if (this.canvasElement) {
      this.renderChart();
    }
  }

  ngOnDestroy() {
    this.canvasElement = undefined;
    this.destroyChart();
  }

  downloadChart() {
    const link = document.createElement('a');
    link.download = `${this.chartId}-${formatDate(new Date())}.png`;
    link.href = this.canvasWithBackground().toDataURL('image/png');
    link.click();
  }

  async copyChart() {
    // Safari only allows the write if the item is built during the click, so the blob goes in as a promise
    const blob = new Promise<Blob>(resolve => this.canvasWithBackground().toBlob(resolve, 'image/png'));
    try {
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      this.planetMessageService.showMessage($localize`Chart copied to clipboard`);
    } catch {
      this.planetMessageService.showAlert($localize`Failed to copy chart to clipboard`);
    }
  }

  private async renderChart() {
    const canvas = this.canvasElement;
    if (!canvas) {
      this.destroyChart();
      return;
    }
    const { Chart: ChartJs } = await loadChart([ 'Legend', 'Tooltip', ...registerablesByType[this.type] ]);
    // The canvas can be replaced while Chart.js loads, and the render for the new one draws it
    if (canvas !== this.canvasElement) {
      return;
    }
    const data = { labels: this.labels, datasets: this.datasets };
    if (this.chart?.canvas === canvas && (this.chart.config as ChartConfiguration).type === this.type) {
      this.chart.data = data;
      this.chart.options = this.chartOptions();
      this.chart.update('none');
      return;
    }
    this.destroyChart();
    this.ngZone.runOutsideAngular(() => {
      this.chart = new ChartJs(canvas, { type: this.type, data, options: this.chartOptions() } as ChartConfiguration);
    });
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private chartOptions(): ChartOptions {
    const { plugins, ...options } = this.options;
    return {
      responsive: true,
      maintainAspectRatio: false,
      // Animation and full-resolution backing stores cost the most on low-end tablets
      animation: false,
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      ...options,
      plugins: { legend: { position: 'bottom' }, ...plugins }
    };
  }

  private canvasWithBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = this.chart.canvas.width;
    canvas.height = this.chart.canvas.height;
    const context = canvas.getContext('2d');
    context.fillStyle = styleVariables.white;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.chart.canvas, 0, 0);
    return canvas;
  }

}
