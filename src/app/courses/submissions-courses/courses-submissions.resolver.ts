import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router, RunGuardsAndResolvers } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { canManageCourse } from '../courses.utils';

// A submission belongs to a course through a parentId of the form `<examId>@<courseId>`,
// which is also how the course submission list queries for them.
const belongsToCourse = (submission: any, courseId: string) =>
  typeof submission?.parentId === 'string' && submission.parentId.endsWith(`@${courseId}`);

// Resolves the course for every course-scoped submission route, so the list and the individual
// exam share one request and one authorization rule instead of each repeating both.
export const courseSubmissionsResolver: ResolveFn<any> = (
  route: ActivatedRouteSnapshot
): RedirectCommand | Observable<any | RedirectCommand> => {
  const router = inject(Router);
  const couchService = inject(CouchService);
  const userService = inject(UserService);
  const stateService = inject(StateService);
  // Submissions are always read from the local database, so there is nothing to manage in parent context.
  const parent = route.data.parent === true;
  const courseId = route.paramMap.get('id');
  const submissionId = route.paramMap.get('submissionId');
  const redirect = new RedirectCommand(router.parseUrl(parent ? '/manager/courses' : '/courses'));
  if (parent || !courseId) {
    return redirect;
  }
  return couchService.get(`courses/${courseId}`).pipe(
    switchMap((course: any) => {
      if (!canManageCourse(course, userService.get(), stateService.configuration.code)) {
        return of(redirect);
      }
      if (!submissionId) {
        return of(course);
      }
      // Authorizing the course is not enough on the exam route: a hand written URL could pair a
      // course the user manages with a submission from a course they do not.
      return couchService.get(`submissions/${submissionId}`).pipe(
        map((submission: any) => belongsToCourse(submission, courseId) ? course : redirect)
      );
    }),
    catchError(() => of(redirect))
  );
};

// questionNum is a matrix param that changes on every question a grader steps through. Matrix params
// count as params, so the default paramsChange policy would re-resolve - and so re-authorize - on each one.
export const courseSubmissionsRerun: RunGuardsAndResolvers = (from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot) =>
  from.paramMap.get('id') !== to.paramMap.get('id') ||
  from.paramMap.get('submissionId') !== to.paramMap.get('submissionId');
