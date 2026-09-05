import type { ChartDataset } from 'chart.js';
import { chartPalette } from '../shared/charts/chart-palette';
import { monthDataLabels } from '../manager-dashboard/reports/reports.utils';

export interface FinanceCharts {
  balance: { labels: string[], datasets: ChartDataset[] };
  monthly: { labels: string[], datasets: ChartDataset[] };
}

const monthKey = (date: number) => {
  const value = new Date(date);
  return new Date(value.getFullYear(), value.getMonth(), 1).valueOf();
};

/*
 * `transactions` arrives newest-first with a running `balance` already accumulated from the first
 * transaction ever recorded, so charting it only needs a chronological re-read, not a recount.
 */
export const financeChartData = (transactions: any[], localeId?: string): FinanceCharts => {
  const chronological = [ ...(transactions || []) ].sort((a, b) => a.date - b.date);

  const months = chronological.reduce((grouped: Map<number, { credit: number, debit: number }>, transaction) => {
    const key = monthKey(transaction.date);
    const current = grouped.get(key) || { credit: 0, debit: 0 };
    grouped.set(key, {
      credit: current.credit + (transaction.credit || 0),
      debit: current.debit + (transaction.debit || 0)
    });
    return grouped;
  }, new Map<number, { credit: number, debit: number }>());
  const monthKeys = Array.from(months.keys()).sort((a: number, b: number) => a - b);

  return {
    balance: {
      labels: chronological.map(transaction => monthDataLabels(transaction.date, localeId)),
      datasets: [ {
        label: $localize`Balance`,
        data: chronological.map(transaction => transaction.balance),
        borderColor: chartPalette.primary,
        backgroundColor: chartPalette.primaryLighter,
        fill: true,
        tension: 0,
        pointRadius: chronological.length > 60 ? 0 : 2
      } as ChartDataset ]
    },
    monthly: {
      labels: monthKeys.map(month => monthDataLabels(month, localeId)),
      datasets: [
        {
          label: $localize`Credits`,
          data: monthKeys.map(month => months.get(month).credit),
          backgroundColor: chartPalette.credit
        } as ChartDataset,
        {
          label: $localize`Debits`,
          data: monthKeys.map(month => months.get(month).debit),
          backgroundColor: chartPalette.debit
        } as ChartDataset
      ]
    }
  };
};
