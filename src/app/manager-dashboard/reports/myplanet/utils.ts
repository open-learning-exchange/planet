import { CsvService } from '../../../shared/csv.service';

/**
 * When `planetName` is provided, `children` should be the items for a single planet.
 * When `planetName` is undefined, `children` is expected to be an array of planets,
 */
export const exportMyPlanetCsv = (csvService: CsvService) => (children: any[], planetName: string | undefined, mapFn: (children: any[], planetName?: string) => any[], title: string): void => {
  const csvData = planetName ? mapFn(children, planetName) : children.flatMap((planet: any) => mapFn(planet.children, planet.name));
  csvService.exportCSV({ data: csvData, title });
};
