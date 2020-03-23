export const attachNamesToPlanets = (planetDocs: any[]) => {
  const names = planetDocs.filter(doc => doc.docType === 'parentName');
  return planetDocs.map(doc => ({ doc, nameDoc: names.find((name: any) => name.planetId === doc._id) }));
};

export const arrangePlanetsIntoHubs = (planets: any[], hubs: any[]) => ({
  hubs: hubs.map(hub => ({
    ...hub,
    children: hub.spokes.map(code => planets.find(planet => planet.doc.code === code)).filter(child => child)
  })),
  sandboxPlanets: planets.filter(
    planet => hubs.find(hub => hub.spokes.indexOf(planet.doc.code) > -1 || planet.doc._id === hub.planetId) === undefined
  )
});

export const sortPlanet = ((a, b) => {
  const planetName = doc => doc.nameDoc ? doc.nameDoc.name : doc.doc.name;
  return planetName(a).localeCompare(planetName(b));
});

export const filterByDate = (array, dateField, { startDate, endDate }) => array.filter(item =>
  item[dateField] >= startDate.getTime() && item[dateField] <= endDate.getTime()
);

export const planetAndParentId = (configuration) => `${configuration.code}@${configuration.parentCode}`;

export const getDomainParams = (configuration) => configuration.planetType === 'community' ?
  { planetCode: configuration.parentCode, domain: configuration.parentDomain } :
  { planetCode: undefined, domain: undefined };

export const setMonths = () => {
  // Added this in as a minimum for reporting to ignore incorrect data, should be deleted after resolved
  const planetLaunchDate = new Date(2018, 6, 1).valueOf();
  const now = new Date();
  return Array(12).fill(1)
    .map((val, index: number) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1).valueOf())
    .filter((month: number) => month > planetLaunchDate);
};

export const activityParams = (planetCode, filter): { planetCode, filterAdmin?, fromMyPlanet? } => {
  return { planetCode: planetCode, filterAdmin: true, ...(filter ? { fromMyPlanet: filter === 'myplanet' } : {}) };
};

export const checkEmptyRecords = (record: any[]) => record.some(element => element.children.length);
