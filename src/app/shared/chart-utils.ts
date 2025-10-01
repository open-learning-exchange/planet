import type { Chart } from 'chart.js';

type ChartJsModule = typeof import('chart.js');
type RegisterableKey = 'ArcElement' | 'BarController' | 'BarElement' | 'CategoryScale' | 'DoughnutController'
  | 'Legend' | 'LinearScale' | 'Title' | 'Tooltip' | 'LineController' | 'PointElement' | 'LineElement';

let chartJsPromise: Promise<ChartJsModule> | null = null;
const registeredKeys = new Set<RegisterableKey>();

function registerOnce(module: ChartJsModule, keys: RegisterableKey[]): void {
  const pending = keys.filter((key) => {
    if (registeredKeys.has(key)) {
      return false;
    }
    if (!(key in module)) {
      console.warn(`Chart.js registerable "${key}" is not available on the module export.`);
      return false;
    }
    registeredKeys.add(key);
    return true;
  }).map((key) => module[key]);

  if (pending.length) {
    module.Chart.register(...pending);
  }
}

export async function loadChart(keys: RegisterableKey[] = []): Promise<ChartJsModule> {
  if (!chartJsPromise) {
    chartJsPromise = import('chart.js').catch((error) => {
      chartJsPromise = null;
      throw error;
    });
  }

  const module = await chartJsPromise;
  if (keys.length) {
    registerOnce(module, keys);
  }
  return module;
}

export type ChartJs = Chart;

export function createChartCanvas(width = 300, height = 400): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function renderNoDataPlaceholder(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, message = 'No data available'): string {
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px sans-serif';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

export const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#8DD4F2', '#A8E6CF', '#DCE775'
];
