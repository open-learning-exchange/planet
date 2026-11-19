import { ReportsDetailActivitiesComponent } from './reports-detail-activities.component';

describe('ReportsDetailActivitiesComponent', () => {

  it('shows each chat\'s turn count from the gateway\'s usage rows', () => {
    const component = new ReportsDetailActivitiesComponent();
    component.activityType = 'chat';
    component.activitiesByDoc = [
      { _id: 'chat-1', user: 'ada', createdDate: 1, aiProvider: 'openai', assistant: false, shared: true, turns: 3, hasAttachments: true }
    ];

    component.ngOnChanges();

    expect(component.activities.data[0]).toMatchObject({ conversationLength: 3, shared: 'True' });
  });

});
