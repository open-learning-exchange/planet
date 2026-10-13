export interface AndroidApp {
  name: string;
  description: string;
  installLabel: string;
  url: string;
}

export const ANDROID_APPS: readonly AndroidApp[] = [
  {
    name: $localize`myPlanet`,
    description: $localize`Full-featured offline learning app`,
    installLabel: $localize`Install myPlanet`,
    url: 'https://play.google.com/store/apps/details?id=org.ole.planet.myplanet'
  },
  {
    name: $localize`myPlanet Lite`,
    description: $localize`Lightweight version that uses less storage`,
    installLabel: $localize`Install myPlanet Lite`,
    url: 'https://play.google.com/store/apps/details?id=org.ole.planet.myplanet.lite'
  }
];
