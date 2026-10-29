import { styleVariables } from '@shared/utils';

import { SubmissionsResultsComponent } from './submissions-results.component';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsResultsComponent', () => {
  const survey = {
    questions: [
      { type: 'input', body: 'Name?' },
      { type: 'select', body: 'Pick one', choices: [ { id: 'a', text: 'Yes' }, { id: 'b', text: 'No' } ] },
      { type: 'selectMultiple', body: 'Pick any', choices: [ { id: 'c', text: 'Red' }, { id: 'd', text: 'Blue' } ] },
      { type: 'ratingScale', body: 'Rate it', scaleMax: 3 }
    ]
  };
  const submission = (userId: string, values: any[]) => ({ user: { _id: userId }, answers: values.map(value => ({ value })) });
  // Planet stores a picked choice as an object, myPlanet as its text
  const submissions = [
    submission('user-1', [ 'Ann', { id: 'a', text: 'Yes' }, [ { id: 'c', text: 'Red' }, { id: 'd', text: 'Blue' } ], '3' ]),
    submission('user-2', [ 'Bo', 'Yes', [ { id: 'd', text: 'Blue' } ], '2' ])
  ];

  it('charts each choice and rating scale question from its own answers', () => {
    // aggregateQuestionResponses needs none of the service's dependencies
    const component = new SubmissionsResultsComponent(Object.create(SubmissionsService.prototype));
    component.survey = survey;
    component.submissions = submissions;
    component.ngOnChanges();

    const [ select, selectMultiple, ratingScale ] = component.questionCharts;
    expect(component.questionCharts.map(chart => chart.index)).toEqual([ 1, 2, 3 ]);
    expect(select).toMatchObject({ type: 'doughnut', labels: [ 'Yes', 'No' ], datasets: [ { data: [ 2, 0 ] } ] });
    expect(select.datasets[0].backgroundColor).toEqual(styleVariables.chartPalette.slice(0, 2));
    expect(selectMultiple).toMatchObject({
      type: 'bar', labels: [ 'Red', 'Blue' ], datasets: [ { data: [ 50, 100 ] } ], isMultiSelect: true
    });
    expect(ratingScale).toMatchObject({ type: 'bar', labels: [ '1', '2', '3' ], datasets: [ { data: [ 0, 1, 1 ] } ] });
  });
});
