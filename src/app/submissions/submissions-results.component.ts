import { Component, Input, OnChanges } from '@angular/core';
import { PlanetChartComponent } from '../shared/charts/planet-chart.component';
import { SubmissionsService } from './submissions.service';
import { QuestionChart, isChartableQuestion, questionChartFromAggregate } from './submissions-charts';

@Component({
  selector: 'planet-submissions-results',
  templateUrl: './submissions-results.component.html',
  styleUrls: [ './submissions-results.scss' ],
  imports: [ PlanetChartComponent ]
})
export class SubmissionsResultsComponent implements OnChanges {

  @Input() exam: any;
  @Input() submissions: any[] = [];

  questionCharts: QuestionChart[] = [];
  totalRespondents = 0;

  constructor(private submissionsService: SubmissionsService) {}

  ngOnChanges() {
    this.totalRespondents = (this.submissions || []).length;
    const questions = this.exam?.questions || [];
    this.questionCharts = questions
      .map((question, index) => ({ question: { ...question, index }, index }))
      .filter(({ question }) => isChartableQuestion(question))
      .map(({ question, index }) => questionChartFromAggregate(
        this.submissionsService.aggregateQuestionResponses(
          question, this.submissions, question.type === 'selectMultiple' ? 'percent' : 'count'
        ),
        question,
        index
      ));
  }

  questionBody(index: number): string {
    return this.exam?.questions?.[index]?.body || '';
  }

}
