import { describe, expect, it } from 'vitest';

import { mergeConfiguration, parentConfiguration, patchOwns, patchesParentConfiguration } from './configuration.utils';

describe('configuration utils', () => {
  const configuration = {
    _id: 'config_id',
    _rev: '3-abc',
    code: 'guatemala',
    name: 'Guatemala',
    parentDomain: 'planet.earth',
    planetType: 'community',
    autoAccept: true,
    currency: { code: 'GTQ', symbol: 'Q' },
    customVoiceLabels: [ 'Abuela' ],
    streaming: false,
    keys: { openai: 'sk-openai', gemini: 'sk-gemini' },
    models: { openai: 'gpt-5' }
  };

  describe('mergeConfiguration', () => {
    it('keeps fields the patch does not mention', () => {
      const merged = mergeConfiguration(configuration, { currency: { code: 'USD', symbol: '$' } });
      expect(merged.keys).toEqual({ openai: 'sk-openai', gemini: 'sk-gemini' });
      expect(merged.name).toBe('Guatemala');
      expect(merged._rev).toBe('3-abc');
    });

    it('replaces top level fields named by the patch', () => {
      expect(mergeConfiguration(configuration, { name: 'Guate', streaming: true })).toMatchObject({
        name: 'Guate',
        streaming: true
      });
    });

    it('merges nested objects one level deeper so a partial patch drops nothing', () => {
      const merged = mergeConfiguration(configuration, { keys: { openai: 'sk-rotated' } });
      expect(merged.keys).toEqual({ openai: 'sk-rotated', gemini: 'sk-gemini' });
    });

    it('does not mutate the configuration it merges onto', () => {
      mergeConfiguration(configuration, { keys: { openai: 'sk-rotated' }, name: 'Guate' });
      expect(configuration.keys.openai).toBe('sk-openai');
      expect(configuration.name).toBe('Guatemala');
    });

    it('handles a missing configuration or patch', () => {
      expect(mergeConfiguration(undefined, { name: 'Guate' })).toEqual({ name: 'Guate' });
      expect(mergeConfiguration(configuration, undefined)).toEqual(configuration);
    });
  });

  describe('parentConfiguration', () => {
    const publicConfiguration: any = parentConfiguration(configuration);

    it('never includes the secret keys', () => {
      expect(publicConfiguration.keys).toBeUndefined();
    });

    it('leaves out local only fields', () => {
      expect(publicConfiguration.currency).toBeUndefined();
      expect(publicConfiguration.customVoiceLabels).toBeUndefined();
      expect(publicConfiguration.models).toBeUndefined();
      expect(publicConfiguration.streaming).toBeUndefined();
    });

    it('drops the local revision but keeps the id so a first push reuses it', () => {
      expect(publicConfiguration._rev).toBeUndefined();
      expect(publicConfiguration._id).toBe('config_id');
    });

    it('keeps the fields the parent planet displays', () => {
      expect(publicConfiguration).toMatchObject({
        code: 'guatemala',
        name: 'Guatemala',
        parentDomain: 'planet.earth',
        planetType: 'community',
        autoAccept: true
      });
    });

    it('omits fields the configuration does not have rather than setting them undefined', () => {
      expect('email' in parentConfiguration(configuration)).toBe(false);
    });
  });

  describe('patchesParentConfiguration', () => {
    it('is true when the patch touches a field the parent keeps', () => {
      expect(patchesParentConfiguration({ registrationRequest: 'pending' })).toBe(true);
      expect(patchesParentConfiguration({ currency: {}, name: 'Guate' })).toBe(true);
    });

    it('is false for a purely local patch', () => {
      expect(patchesParentConfiguration({ keys: {}, models: {}, streaming: true })).toBe(false);
      expect(patchesParentConfiguration({ currency: { code: 'USD', symbol: '$' } })).toBe(false);
      expect(patchesParentConfiguration({ customVoiceLabels: [ 'Maestro' ] })).toBe(false);
      expect(patchesParentConfiguration({})).toBe(false);
    });

    it('ignores the fields which only address the doc', () => {
      expect(patchesParentConfiguration({ _id: 'config_id', _rev: '3-local' })).toBe(false);
      expect(patchesParentConfiguration({ _id: 'config_id', customVoiceLabels: [ 'Maestro' ] })).toBe(false);
    });
  });

  describe('patchOwns', () => {
    it('is true only when the patch sets the field itself', () => {
      expect(patchOwns({ autoAccept: false }, 'autoAccept')).toBe(true);
      expect(patchOwns({ autoAccept: undefined }, 'autoAccept')).toBe(true);
      expect(patchOwns({ currency: {} }, 'autoAccept')).toBe(false);
      expect(patchOwns({}, 'autoAccept')).toBe(false);
      expect(patchOwns(undefined, 'autoAccept')).toBe(false);
    });

    it('does not mistake an inherited property for one the patch owns', () => {
      expect(patchOwns({ currency: {} }, 'constructor')).toBe(false);
    });
  });
});
