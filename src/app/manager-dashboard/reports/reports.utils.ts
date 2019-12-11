export const attachNamesToPlanets = (planetDocs: any[]) => {
  const names = planetDocs.filter(doc => doc.docType === 'parentName');
  return planetDocs.map(doc => ({ doc, nameDoc: names.find((name: any) => name.planetId === doc._id) }));
};

export const arrangePlanetsIntoHubs = (planets: any[], hubs: any[]) => ({
  hubs: hubs.map(hub => ({
    ...hub,
    children: hub.spokes.map(code => planets.find(planet => planet.doc.code === code)).filter(child => child)
  })),
  sandboxPlanets: planets.filter(planet => hubs.find(hub => hub.spokes.indexOf(planet.doc.code) > -1) === undefined)
});

export const sortPlanet = ((a, b) => {
  return (a.nameDoc ? a.nameDoc.name : a.doc.name).toLowerCase() - (b.nameDoc ? b.nameDoc.name : b.doc.name).toLowerCase();
});
