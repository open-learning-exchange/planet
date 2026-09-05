import { financeChartData } from './teams-finances-charts';

describe('financeChartData', () => {

  const transaction = (date: Date, credit: number, debit: number, balance: number) =>
    ({ date: date.getTime(), credit, debit, balance });

  it('orders the balance series chronologically from newest-first input', () => {
    const { balance } = financeChartData([
      transaction(new Date(2026, 1, 10), 0, 30, 70),
      transaction(new Date(2026, 0, 5), 100, 0, 100)
    ], 'en-US');

    expect(balance.datasets[0].data).toEqual([ 100, 70 ]);
  });

  it('sums credits and debits per calendar month', () => {
    const { monthly } = financeChartData([
      transaction(new Date(2026, 0, 5), 100, 0, 100),
      transaction(new Date(2026, 0, 20), 50, 0, 150),
      transaction(new Date(2026, 1, 10), 0, 30, 120)
    ], 'en-US');

    expect(monthly.labels.length).toBe(2);
    expect(monthly.datasets[0].data).toEqual([ 150, 0 ]);
    expect(monthly.datasets[1].data).toEqual([ 0, 30 ]);
  });

  it('treats missing credit or debit values as zero', () => {
    const { monthly } = financeChartData([ { date: new Date(2026, 0, 5).getTime(), balance: 0 } ], 'en-US');

    expect(monthly.datasets[0].data).toEqual([ 0 ]);
    expect(monthly.datasets[1].data).toEqual([ 0 ]);
  });

  it('returns empty series for no transactions', () => {
    const { balance, monthly } = financeChartData([], 'en-US');

    expect(balance.labels).toEqual([]);
    expect(monthly.labels).toEqual([]);
  });

  it('does not mutate the array it is given', () => {
    const transactions = [
      transaction(new Date(2026, 1, 10), 0, 30, 70),
      transaction(new Date(2026, 0, 5), 100, 0, 100)
    ];
    const firstDate = transactions[0].date;

    financeChartData(transactions, 'en-US');

    expect(transactions[0].date).toBe(firstDate);
  });

});
