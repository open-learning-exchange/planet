import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { UnsavedChangesPromptComponent } from '../unsaved-changes.component';
import { DialogsVoiceLabelsComponent } from './dialogs-voice-labels.component';

describe('DialogsVoiceLabelsComponent', () => {
  let dialogRef: any;
  let stateService: any;
  let configurationService: any;
  let couchService: any;
  let planetMessageService: any;
  let dialogsLoadingService: any;
  let dialog: any;

  const createComponent = (data: any) => new DialogsVoiceLabelsComponent(
    dialogRef,
    data,
    stateService,
    configurationService,
    couchService,
    planetMessageService,
    dialogsLoadingService,
    dialog
  );

  beforeEach(() => {
    dialogRef = {
      close: vi.fn(),
      disableClose: false,
      backdropClick: vi.fn().mockReturnValue(NEVER),
      keydownEvents: vi.fn().mockReturnValue(NEVER)
    };
    stateService = {
      configuration: { _id: 'configuration', code: 'local', customVoiceLabels: [ 'Stale label' ] },
      requestData: vi.fn()
    };
    configurationService = {
      patchLocalConfiguration: vi.fn().mockReturnValue(of({}))
    };
    couchService = {
      get: vi.fn().mockReturnValue(of({
        _id: 'configuration',
        _rev: '2-current',
        code: 'local',
        customVoiceLabels: [ 'Stale label' ],
        keys: { service: 'secret' }
      })),
      updateDocument: vi.fn().mockReturnValue(of({}))
    };
    planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    dialog = {};
  });

  afterEach(() => vi.restoreAllMocks());

  it('does not start loading when group settings are unavailable', () => {
    const component = createComponent({ target: 'team' });
    component.ngOnInit();
    component.customLabels.push('Event');

    component.save();

    expect(dialogsLoadingService.start).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalled();
  });

  it('uses the labels supplied by the parent and updates only the local configuration', () => {
    const component = createComponent({ target: 'community', customLabels: [ 'Current label' ] });
    component.ngOnInit();
    component.customLabels.push('New label');

    component.save();

    expect(component.initialCustomLabels).toEqual([ 'Current label' ]);
    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [ 'Current label', 'New label' ]
    });
    expect(couchService.get).not.toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(stateService.requestData).toHaveBeenCalledWith('configurations', 'local');
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith([ 'Current label', 'New label' ]);
  });

  it('adds valid pending input before saving', () => {
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.newLabelInput = 'Event';

    component.save();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [ 'Event' ]
    });
    expect(dialogRef.close).toHaveBeenCalledWith([ 'Event' ]);
  });

  it('persists a display-casing change', () => {
    const component = createComponent({ target: 'community', customLabels: [ 'Announcement' ] });
    component.ngOnInit();
    component.customLabels = [ 'announcement' ];

    component.save();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [ 'announcement' ]
    });
  });

  it('merges team labels into the latest team revision', () => {
    couchService.get.mockReturnValue(of({ _id: 'team', _rev: '2-current', name: 'Team' }));
    const component = createComponent({
      target: 'team',
      team: { _id: 'team', _rev: '1-stale' },
      customLabels: []
    });
    component.ngOnInit();
    component.customLabels.push('Event');

    component.save();

    expect(couchService.get).toHaveBeenCalledWith('teams/team');
    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', {
      _id: 'team',
      _rev: '2-current',
      name: 'Team',
      customVoiceLabels: [ 'Event' ]
    });
  });

  it('asks for confirmation before discarding edited labels', () => {
    vi.spyOn(UnsavedChangesPromptComponent, 'open').mockReturnValue(of(true));
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.customLabels.push('Event');

    component.requestClose();

    expect(UnsavedChangesPromptComponent.open).toHaveBeenCalledWith(dialog);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('reserves the synthetic shared chat label', () => {
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.newLabelInput = 'Shared Chat';

    component.addLabel();

    expect(component.customLabels).toEqual([]);
    expect(component.errorMessage).toContain('reserved');
  });

  it('uses a services-specific section heading', () => {
    const component = createComponent({ target: 'services', team: { _id: 'services' } });
    component.ngOnInit();

    expect(component.sectionHeader).toBe('Services labels');
  });
});
