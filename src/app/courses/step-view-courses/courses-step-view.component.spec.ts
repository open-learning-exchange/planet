import { CoursesStepViewComponent } from './courses-step-view.component';

describe('CoursesStepViewComponent resource selection', () => {
  it('uses current resource attachment metadata instead of the course snapshot', () => {
    const component = Object.create(CoursesStepViewComponent.prototype) as CoursesStepViewComponent;
    const staleReference = {
      '_id': 'resource-1',
      '_attachments': { 'video.mp4': { 'content_type': 'video/mp4' } }
    };
    const currentResource = {
      '_id': 'resource-1',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf' } }
    };

    expect(component.filterResources({ 'resources': [ staleReference ] }, [ currentResource ]))
      .toEqual([ currentResource ]);
  });
});
