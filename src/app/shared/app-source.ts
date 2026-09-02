// Activity documents may identify the OLE app that wrote them with an `app` field: 'planet' from the
// web app, 'myplanet' from myPlanet, or 'myplanet-lite' from myPlanet Lite. Documents without a
// recognized `app` value are classified by the presence of `androidId`, which only the Android
// clients set, so legacy documents keep landing in the bucket they always did. That fallback is why
// myPlanet Lite, which also writes `androidId`, has to declare itself to be counted apart from
// myPlanet.

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
