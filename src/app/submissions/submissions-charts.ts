import type { ChartDataset, ChartType } from 'chart.js';
import { paletteColor, paletteColors } from '../shared/charts/chart-palette';

export const chartableQuestionTypes = [ 'select', 'selectMultiple', 'ratingScale' ];

export interface QuestionChart {
  index: number;
  title: string;
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
  footnote: string;
  totalRespondents: number;
}

/*
 * `aggregateQuestionResponses` already decides the shape of each question's answers; this only turns
 * that aggregation into a Chart.js dataset so the survey results view and the PDF export agree.
 */
export const questionChartFromAggregate = (aggregate: any, question: any, index: number): QuestionChart => {
  const isBar = aggregate.chartType === 'bar';
  const isPercent = question.type === 'selectMultiple';
  const label = question.type === 'ratingScale' ?
    $localize`Responses` :
    (isPercent ? $localize`% of respondents` : $localize`Responses`);
  return {
    index,
    title: $localize`Question ${index + 1}`,
    type: isBar ? 'bar' : 'pie',
    labels: aggregate.labels,
    datasets: [ {
      label,
      data: aggregate.data,
      backgroundColor: isBar ? paletteColor(index) : paletteColors(aggregate.labels.length)
    } as ChartDataset ],
    footnote: isPercent ?
      $localize`Respondents may select more than one option, so percentages can total over 100%.` :
      '',
    totalRespondents: aggregate.totalUsers
  };
};

export const isChartableQuestion = (question: any) => chartableQuestionTypes.indexOf(question?.type) > -1;
