import { CoursesStepViewComponent } from './courses-step-view.component';

describe('CoursesStepViewComponent course chat context', () => {
  const createComponent = () => {
    const component = Object.create(CoursesStepViewComponent.prototype) as CoursesStepViewComponent;
    component.stepDetail = { stepTitle: 'Introduction', description: 'Read the guide' };
    component.parent = false;
    (component as any).updateChatContext();
    return component;
  };

  it('builds local course chat context from the displayed step and resource', () => {
    const component = createComponent();
    const currentResource = {
      _id: 'resource-1',
      _attachments: { 'guide.pdf': { content_type: 'application/pdf' } }
    };
    component.resource = component.filterResources(
      { resources: [ { _id: currentResource._id } ] },
      [ currentResource ]
    )[0];
    (component as any).updateChatContext();

    expect(component.chatContext).toEqual({
      type: 'coursestep',
      data: component.localizedStepInfo,
      resource: { id: currentResource._id, attachments: currentResource._attachments }
    });
  });

  it('uses text-only context for a course loaded from the parent Planet', () => {
    const component = createComponent();
    component.parent = true;
    component.resource = { _id: 'parent-resource', _attachments: {} };
    (component as any).updateChatContext();

    expect(component.chatContext).toEqual({
      type: 'coursestep',
      data: component.localizedStepInfo
    });
  });
});
