import { of } from 'rxjs';
import { vi } from 'vitest';
import { CommunityComponent } from './community.component';
import { DialogsVoiceLabelsComponent } from '../shared/dialogs/dialogs-voice-labels.component';

describe('CommunityComponent custom labels', () => {
  it('allows community leaders and planet managers to manage community labels', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.planetCode = null;
    component.isCommunityLeader = true;
    (component as any).userService = { doesUserHaveRole: () => false };

    expect(component.canManageLabels).toBe(true);

    component.isCommunityLeader = false;
    (component as any).userService = { doesUserHaveRole: () => true };

    expect(component.canManageLabels).toBe(true);
  });

  it('filters malformed labels without crashing', () => {
    const component = Object.create(CommunityComponent.prototype) as CommunityComponent;
    component.news = [ { doc: { labels: [ null, 42, 'Event' ], viewIn: [] } } ];
    component.selectedLabel = 'event';
    component.voiceSearch = '';

    component.applyFilters();

    expect(component.filteredNews).toEqual(component.news);
  });

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
