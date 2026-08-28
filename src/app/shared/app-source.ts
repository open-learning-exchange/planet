// Every activity document in the ecosystem is written by one of the OLE apps, which each stamp their
// own name on the `app` field: 'planet' from the web app, 'myplanet' from myPlanet, 'myplanet-lite'
// from myPlanet Lite.  Documents written before that field existed are classified by the presence of
// `androidId`, which only the Android clients set, so they keep landing in the bucket they always
// did.  That fallback is why myPlanet needs no change to stay separated, and why myPlanet Lite --
// which also writes `androidId` -- has to declare itself to be counted apart from myPlanet.

export type AppSource = 'planet' | 'myplanet' | 'myplanet-lite';
export type AppSourceFilter = AppSource | '';

export const appSources: { value: AppSource, label: string }[] = [
  { value: 'planet', label: $localize`Planet` },
  { value: 'myplanet', label: $localize`myPlanet` },
  { value: 'myplanet-lite', label: $localize`myPlanet Lite` }
];

const isAppSource = (value: any): value is AppSource => appSources.some(source => source.value === value);

export const appSourceOf = (doc: any): AppSource => {
  if (isAppSource(doc?.app)) {
    return doc.app;
  }
  return doc?.androidId === undefined ? 'planet' : 'myplanet';
};

export const appSourceLabel = (doc: any): string =>
  appSources.find(source => source.value === appSourceOf(doc)).label;

export const isFromAppSource = (doc: any, filter: AppSourceFilter): boolean =>
  filter === '' || appSourceOf(doc) === filter;

// Mango selector fragment for a CouchDB query.  myPlanet docs predate the `app` field, so they are
// matched as "has an androidId and does not declare a different app".
export const appSourceSelector = (filter: AppSourceFilter | undefined) => {
  switch (filter) {
    case 'planet':
      return { androidId: { $exists: false } };
    case 'myplanet':
      return { androidId: { $exists: true }, app: { $ne: 'myplanet-lite' } };
    case 'myplanet-lite':
      return { app: 'myplanet-lite' };
    default:
      return {};
  }
};
