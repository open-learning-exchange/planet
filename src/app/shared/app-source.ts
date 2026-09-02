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
