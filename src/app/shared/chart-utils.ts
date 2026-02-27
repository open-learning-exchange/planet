import { getThemeColor } from './utils';

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

export function createChartCanvas(width = 300, height = 400): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function renderNoDataPlaceholder(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, message = 'No data available'): string {
  ctx.fillStyle = getThemeColor('--grey-color') || '#666666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px sans-serif';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

export function getChartColors(): string[] {
  return [
    getThemeColor('--chart-color-1') || '#FF6384',
    getThemeColor('--chart-color-2') || '#36A2EB',
    getThemeColor('--chart-color-3') || '#FFCE56',
    getThemeColor('--chart-color-4') || '#4BC0C0',
    getThemeColor('--chart-color-5') || '#9966FF',
    getThemeColor('--chart-color-6') || '#FF9F40',
    getThemeColor('--chart-color-7') || '#C9CBCF',
    getThemeColor('--chart-color-8') || '#8DD4F2',
    getThemeColor('--chart-color-9') || '#A8E6CF',
    getThemeColor('--chart-color-10') || '#DCE775'
  ];
}

export const CHART_COLORS = getChartColors();
