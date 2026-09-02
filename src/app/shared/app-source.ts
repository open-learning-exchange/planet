export type AppSource = 'planet' | 'myplanet' | 'myplanet-lite';
export type AppSourceFilter = AppSource | '';

export const appSources: { value: AppSource, label: string }[] = [
  { value: 'planet', label: $localize`Planet` },
  { value: 'myplanet', label: $localize`myPlanet` },
  { value: 'myplanet-lite', label: $localize`myPlanet Lite` }
];

const normalizeAppSource = (value: any): AppSource | undefined => {
  const normalizedValue = typeof value === 'string' ? value.toLowerCase() : value;
  return appSources.find(source => source.value === normalizedValue)?.value;
};

export const appSourceOf = (doc: any): AppSource => {
  const appSource = normalizeAppSource(doc?.app);
  if (appSource) {
    return appSource;
  }
  return doc?.androidId === undefined ? 'planet' : 'myplanet';
};

export const appSourceLabel = (doc: any): string =>
  appSources.find(source => source.value === appSourceOf(doc)).label;

export const isFromAppSource = (doc: any, filter: AppSourceFilter): boolean =>
  filter === '' || appSourceOf(doc) === filter;
