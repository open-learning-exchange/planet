import { of } from 'rxjs';
import { vi } from 'vitest';
import { CommunityComponent } from './community.component';
import { DialogsVoiceLabelsComponent } from '../shared/dialogs/dialogs-voice-labels.component';

describe('CommunityComponent custom labels', () => {
  it('passes current labels to the dialog and applies the saved vocabulary locally', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.planetCode = null;
    component.configuration = { customVoiceLabels: [ 'Announcement', 'Event' ] };
    component.customVoiceLabels = [ 'Announcement', 'Event' ];
    component.selectedLabel = 'ANNOUNCEMENT';
    const open = vi.fn().mockReturnValue({ afterClosed: () => of([ 'Event' ]) });
    (component as any).dialog = {
      open
    };
    vi.spyOn(component, 'requestNewsAndUsers').mockImplementation(() => undefined);

    component.openManageLabelsDialog();

    expect(open).toHaveBeenCalledWith(DialogsVoiceLabelsComponent, {
      width: '500px',
      autoFocus: false,
      data: { target: 'community', customLabels: [ 'Announcement', 'Event' ] }
    });
    expect(component.selectedLabel).toBe('ANNOUNCEMENT');
    expect(component.customVoiceLabels).toEqual([ 'Event' ]);
    expect(component.requestNewsAndUsers).not.toHaveBeenCalled();
  });

  it('precomputes group label names for case-insensitive icon lookup', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.getAvailableLabels([ { doc: { labels: [], viewIn: [ { name: 'Team Events' } ] } } ]);

    expect(component.getLabelIcon('team events')).toBe('groups');
  });
});
