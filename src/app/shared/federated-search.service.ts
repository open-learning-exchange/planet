import { Injectable } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { CoursesService } from '../courses/courses.service';
import { ResourcesService } from '../resources/resources.service';
import { FuzzySearchService } from './fuzzy-search.service';

@Injectable({ providedIn: 'root' })
export class FederatedSearchService {
  constructor(
    private coursesService: CoursesService,
    private resourcesService: ResourcesService,
    private fuzzy: FuzzySearchService,
  ) {}

  search(term: string) {
    const query = term ? term.trim() : '';
    return combineLatest([
      this.coursesService.coursesListener$(),
      this.resourcesService.resourcesListener(false)
    ]).pipe(
      map(([courses, resources]) => {
        if (!query) {
          return [];
        }
        const match = (data: any) => {
          const title = data.doc.courseTitle || data.doc.title || '';
          return this.fuzzy.fuzzyWordMatch(query, title, { threshold: 0.6, maxDistance: 2 });
        };
        const courseResults = courses.filter(match).map(res => ({ ...res, type: 'course' }));
        const resourceResults = resources.filter(match).map(res => ({ ...res, type: 'resource' }));
        return [...courseResults, ...resourceResults];
      })
    );
  }
}
