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
