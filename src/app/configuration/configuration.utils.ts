/**
 * Fields of the local `configurations` doc which are shared with the parent planet's
 * `communityregistrationrequests` database. This is an allowlist, so anything not named here stays
 * on this planet: AI provider secrets in `keys`, gateway settings (`models`, `assistant`,
 * `streaming`) and local preferences such as `currency`. `_rev` is deliberately absent because the
 * parent keeps its own revision history for the doc.
 */
export const parentConfigurationFields = [
  '_id',
  'adminName',
  'alwaysOnline',
  'autoAccept',
  'betaEnabled',
  'code',
  'createdDate',
  'email',
  'firstName',
  'lastName',
  'localDomain',
  'middleName',
  'name',
  'parentCode',
  'parentDomain',
  'phoneNumber',
  'planetType',
  'preferredLang',
  'registrationRequest'
];

const isMergeable = (value: any) => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Merges a patch into the configuration doc it was read against. Top level fields of the patch
 * replace their counterparts, nested objects (`keys`, `models`, `assistant`, `currency`) are merged
 * one level deeper so a partial submission never drops stored values, and fields the patch does not
 * mention keep the value they have on the doc. Secrets the caller never saw are therefore preserved
 * without the caller having to restore them.
 */
export const mergeConfiguration = (configuration: any = {}, patch: any = {}) =>
  Object.entries<any>(patch).reduce((merged: any, [ field, value ]) => ({
    ...merged,
    [field]: isMergeable(value) && isMergeable(configuration[field]) ? { ...configuration[field], ...value } : value
  }), { ...configuration });

/** Narrows a configuration down to the fields which may be sent to the parent planet. */
export const parentConfiguration = (configuration: any = {}) =>
  parentConfigurationFields.reduce((publicConfiguration: any, field) =>
    configuration[field] === undefined ? publicConfiguration : { ...publicConfiguration, [field]: configuration[field] }, {});

/** True when a patch changes at least one field the parent planet keeps a copy of. */
export const patchesParentConfiguration = (patch: any = {}) =>
  Object.keys(patch).some(field => parentConfigurationFields.indexOf(field) > -1);
