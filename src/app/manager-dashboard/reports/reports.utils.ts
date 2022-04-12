import { millisecondsToDay } from '../../meetups/constants';

export const attachNamesToPlanets = (planetDocs: any[]) => {
  const names = planetDocs.filter(doc => doc.docType === 'parentName');
  return planetDocs.map(doc => ({ doc, nameDoc: names.find((name: any) => name.planetId === doc._id) }));
};

export const codeToPlanetName = (code: string, configuration: any, childPlanets: any[]) => {
  const planet = childPlanets.find((childPlanet: any) => childPlanet.doc.code === code);
  return planet ? (planet.nameDoc && planet.nameDoc.name) || planet.doc.name : configuration.name;
};

export const sortPlanet = ((a, b) => {
  const planetName = doc => doc.nameDoc ? doc.nameDoc.name : doc.doc.name;
  return planetName(a).localeCompare(planetName(b));
});

export const arrangePlanetsIntoHubs = (planets: any[], hubs: any[]) => ({
  hubs: hubs.map(hub => ({
    ...hub,
    children: hub.spokes.map(code => planets.find(planet => planet.doc.code === code)).filter(child => child).sort(sortPlanet),
    hubPlanetDoc: (planets.find(planet => planet.doc._id === hub.planetId) || {}).doc
  })),
  sandboxPlanets: planets.filter(
    planet => hubs.find(hub => hub.spokes.indexOf(planet.doc.code) > -1 || planet.doc._id === hub.planetId) === undefined
  )
});

export const itemInDateRange = (item, dateField, startDate, endDate) => {
  return item[dateField] >= startDate.getTime() && item[dateField] <= endDate.getTime();
};

export const filterByDate = (array, dateField, { startDate, endDate, isEndInclusive = true, additionalFilterFunction = (i?) => true }) => {
  const endTime = isEndInclusive ? new Date(new Date(endDate).setHours(24)) : endDate;
  return array.filter(item => additionalFilterFunction(item) && itemInDateRange(item, dateField, startDate, endTime));
};

export const isSelectedMember = (item, members) => members.length === 0 ||
  members.some(member => (member.userId === item.userId || member.userId.split(':')[1] === item.user));

export const filterByMember = (array, members = []) => array.filter(item => isSelectedMember(item, members));

export const planetAndParentId = (configuration) => `${configuration.code}@${configuration.parentCode}`;

export const getDomainParams = (configuration, isHub) => isHub ?
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

export const activityParams = (planetCode): { planetCode, filterAdmin?, fromMyPlanet? } => {
  return { planetCode: planetCode, filterAdmin: true };
};

export const areNoChildren = (record: ({ children: any[] } & any)[]) => record.every(element => element.children.length === 0);

export const reportsDetailParams = (type) => ({
  courseActivities: { db: 'course_activities', views: 'totalCourseViews', record: 'courses', chartName: 'courseViewChart' },
  resourceActivities: { db: 'resource_activities', views: 'totalResourceViews', record: 'resources', chartName: 'resourceViewChart' },
})[type];

export const monthDataLabels = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export const weekDataLabels = (date) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

export const xyChartData = (data, unique) => data.map((visit: any) => ({
  x: monthDataLabels(visit.date),
  y: unique ? visit.unique.length : visit.count || 0
}));

export const datasetObject = (label, data, backgroundColor) => ({ label, data, backgroundColor });

export const titleOfChartName = (chartName: string) => {
  const chartNames = {
    resourceViewChart: $localize`Resource Views by Month`,
    courseViewChart: $localize`Course Views by Month`,
    visitChart: $localize`Total Member Visits by Month`,
    uniqueVisitChart: $localize`Unique Member Visits by Month`,
    stepCompletedChart: $localize`Steps Completed by Month`
  };
  return chartNames[chartName];
};

export const generateWeeksArray = (dateRange: { startDate: Date, endDate: Date }, startWeekOffset = 1) => {
  const { startDate, endDate } = { startDate: new Date(dateRange.startDate), endDate: new Date(dateRange.endDate) };
  let weekStart = startDate.setDate(startDate.getDate() - ((startDate.getDay() + startWeekOffset) % 7));
  const weeks: number[] = [];
  while (weekStart < endDate.getTime()) {
    weeks.push(weekStart);
    weekStart = weekStart + (millisecondsToDay * 7);
  }
  return weeks;
};

export const scaleLabel = (labelString: string) => ({
  display: true, labelString, fontSize: 12, fontStyle: 'bold'
});
