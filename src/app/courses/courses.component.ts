import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy, HostListener, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormControl, } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { FuzzySearchService } from '../shared/fuzzy-search.service';
import {
  filterSpecificFields, composeFilterFunctions, createDeleteArray, filterTags,
  commonSortingDataAccessor, selectedOutOfFilter, filterShelf, trackById, filterIds, filterAdvancedSearch, filterSpecificFieldsHybrid
} from '../shared/table-helpers';
import * as constants from './constants';
import { languages } from '../shared/languages';
import { SyncService } from '../shared/sync.service';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CoursesService } from './courses.service';
import { dedupeShelfReduce, findByIdInArray, calculateMdAdjustedLimit, itemsShown } from '../shared/utils';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TagsService } from '../shared/forms/tags.service';
import { PlanetTagInputComponent } from '../shared/forms/planet-tag-input.component';
import { SearchService } from '../shared/forms/search.service';
import { CoursesViewDetailDialogComponent } from './view-courses/courses-view-detail.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { CoursesSearchComponent } from './search-courses/courses-search.component';

@Component({
  selector: 'planet-courses',
  templateUrl: './courses.component.html',
  styleUrls: [ './courses.scss' ],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  encapsulation: ViewEncapsulation.None
})

export class CoursesComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  isLoading = true;
  selection = new SelectionModel(true, []);
  selectedNotEnrolled = 0;
  selectedEnrolled = 0;
  selectedLocal = 0;
  get tableData() {
    return this.courses;
  }
  courses = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(CoursesSearchComponent) searchComponent: CoursesSearchComponent;
  @Input() isDialog = false;
  @Input() isForm = false;
  @Input() displayedColumns = [ 'select', 'courseTitle', 'info', 'createdDate', 'rating' ];
  @Input() excludeIds = [];
  @Input() includeIds: string[] = [];
  dialogRef: MatDialogRef<DialogsListComponent>;
  message = '';
  deleteDialog: any;
  fb: UntypedFormBuilder;
  courseForm: UntypedFormGroup;
  readonly dbName = 'courses';
  parent = this.route.snapshot.data.parent;
  planetConfiguration = this.stateService.configuration;
  getOpts = this.parent ? { domain: this.planetConfiguration.parentDomain } : {};
  languages: any = languages;
  gradeOptions: any = constants.gradeLevels;
  subjectOptions: any = constants.subjectLevels;
  filter = {
    'doc.languageOfInstruction': '',
    'doc.gradeLevel': '',
    'doc.subjectLevel': ''
  };
  filterIds = { ids: [] };
  readonly myCoursesFilter: { value: 'on' | 'off' } = { value: this.route.snapshot.data.myCourses === true ? 'on' : 'off' };
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the courses filter
    this.courses.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
    this.recordSearch();
    this.removeFilteredFromSelection();
  }
  user = this.userService.get();
  userShelf: any = [];
  private onDestroy$ = new Subject<void>();
  planetType = this.planetConfiguration.planetType;
  isAuthorized = false;
  tagFilter = new UntypedFormControl([]);
  tagFilterValue = [];
  searchSelection: any = { _empty: true };
  filterPredicate = composeFilterFunctions([
    filterAdvancedSearch(this.searchSelection),
    filterTags(this.tagFilter),
    filterSpecificFieldsHybrid([ 'doc.courseTitle' ], this.fuzzySearchService),
    filterShelf(this.myCoursesFilter, 'admission'),
    filterIds(this.filterIds)
  ]);
  trackById = trackById;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFilters = false;
  showFiltersRow = false;
  expandedElement: any = null;
  previewLimit = 450;

  @ViewChild(PlanetTagInputComponent)
  private tagInputComponent: PlanetTagInputComponent;

  constructor(
    private couchService: CouchService,
    private coursesService: CoursesService,
    private dialog: MatDialog,
    private dialogsListService: DialogsListService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private syncService: SyncService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private tagsService: TagsService,
    private searchService: SearchService,
    private deviceInfoService: DeviceInfoService,
    private fuzzySearchService: FuzzySearchService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.setupList(this.courses.data, shelf.courseIds);
      });
    this.dialogsLoadingService.start();
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.titleSearch = '';
    this.getCourses();
    this.userShelf = this.userService.shelf;
    this.courses.filterPredicate = this.filterPredicate;
    this.courses.sortingDataAccessor = commonSortingDataAccessor;
    this.coursesService.coursesListener$(this.parent).pipe(
      takeUntil(this.onDestroy$),
      switchMap((courses: any) => this.parent && courses !== undefined ?
        this.couchService.localComparison(this.dbName, courses) : of(courses)
      )
    ).subscribe((courses: any) => {
      if (courses === undefined) {
        return;
      }
      // Sort in descending createdDate order, so the new courses can be shown on the top
      courses.sort((a, b) => b.doc.createdDate - a.doc.createdDate);
      this.userShelf = this.userService.shelf;
      this.courses.data = this.setupList(courses, this.userShelf.courseIds)
        .filter((course: any) => this.excludeIds.indexOf(course._id) === -1);
      this.isLoading = false;
      this.dialogsLoadingService.stop();
    });
    this.selection.changed.subscribe(({ source }) => {
      this.countSelectNotEnrolled(source.selected);
    });
    this.couchService.checkAuthorization('courses').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.tagFilter.valueChanges.subscribe((tags) => {
      this.tagFilterValue = tags;
      this.titleSearch = this.titleSearch;
      this.removeFilteredFromSelection();
    });
  }

  ngOnChanges() {
    this.filterIds.ids = this.includeIds;
    this.titleSearch = this.titleSearch;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.recordSearch(true);
  }

  setupList(courseRes, myCourses) {
    return courseRes.map((course: any) => {
      const myCourseIndex = myCourses.findIndex(courseId => course._id === courseId);
      course.canManage = this.user.isUserAdmin ||
        (course.doc.creator === this.user.name + '@' + this.planetConfiguration.code);
      course.admission = myCourseIndex > -1;
      return course;
    });
  }

  getCourses() {
    this.coursesService.requestCourses(this.parent);
  }

  ngAfterViewInit() {
    this.courses.sort = this.sort;
    this.courses.paginator = this.paginator;
    if (this.tagInputComponent) {
      this.tagInputComponent.addTags(this.route.snapshot.paramMap.get('collections'));
    }
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  searchFilter(filterValue: string) {
    this.courses.filter = filterValue;
  }

  updateCourse(course) {
    const { _id: courseId } = course;
    this.router.navigate([ '/courses/update/' + course._id ]);
  }

  deleteClick(course) {
    this.openDeleteDialog(this.deleteCourse(course), 'single', course.courseTitle, 1);
  }

  deleteSelected() {
    const selected = this.selection.selected.map(courseId => findByIdInArray(this.courses.data, courseId).doc);
    let amount = 'many',
      okClick = this.deleteCourses(selected),
      displayName = '';
    if (selected.length === 1) {
      const course = selected[0];
      amount = 'single';
      okClick = this.deleteCourse(course);
      displayName = course.courseTitle;
    }
    this.openDeleteDialog(okClick, amount, displayName, selected.length);
  }

  openDeleteDialog(okClick, amount, displayName = '', count) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'course',
        displayName,
        count
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteCourse(course) {
    const { _id: courseId, _rev: courseRev } = course;
    return {
      request: this.couchService.delete('courses/' + courseId + '?rev=' + courseRev),
      onNext: (data) => {
        this.selection.deselect(course._id);
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.courses.data = this.courses.data.filter((c: any) => data.id !== c._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`Course deleted: ${course.courseTitle}`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this course.`)
    };
  }

  deleteCourses(courses) {
    const deleteArray = createDeleteArray(courses);
    return {
      request: this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray }),
      onNext: (data: any) => {
        this.getCourses();
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted ${deleteArray.length} courses`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting courses.`)
    };
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route.parent });
  }

  enrollLeaveToggle(courseIds, type) {
    this.coursesService.courseAdmissionMany(courseIds.filter(id => this.hasSteps(id)), type).subscribe((res) => {
      this.countSelectNotEnrolled(this.selection.selected);
    }, (error) => ((error)));
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    return this.selection.selected.length === itemsShown(this.paginator);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.courses.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
    }
  }

  countSelectNotEnrolled(selected: any) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected.filter(id => this.hasSteps(id)), 'courseIds');
    this.selectedEnrolled = inShelf;
    this.selectedNotEnrolled = notInShelf;
    this.selectedLocal = selected.filter(id => this.isLocalOrNation(id)).length;
  }

  hasSteps(id: string) {
    return this.courses.data.find((course: any) => course._id === id && course.doc.steps.length > 0);
  }

  isLocalOrNation(id: string) {
    return this.courses.data.find((course: any) =>
      course._id === id && (course.doc.sourcePlanet === this.planetConfiguration.code || this.planetConfiguration.parentCode === 'earth')
    );
  }

  onFilterChange(filterValue: string, field: string) {
    this.filter[field] = filterValue === 'All' ? '' : filterValue;
    // titleSearch set runs dropdownsFill and recordSearch
    this.titleSearch = this.titleSearch;
    this.removeFilteredFromSelection();
  }

  removeFilteredFromSelection() {
    this.selection.deselect(...selectedOutOfFilter(this.courses.filteredData, this.selection, this.paginator));
  }

  onSearchChange({ items, category }) {
    this.searchSelection[category] = items;
    this.searchSelection._empty = Object.entries(this.searchSelection).every(
      ([ field, val ]: any[]) => !Array.isArray(val) || val.length === 0
    );
    this.titleSearch = this.titleSearch;
    this.removeFilteredFromSelection();
  }

  resetFilter() {
    this.tagFilter.setValue([]);
    this.tagFilterValue = [];
    Object.keys(this.searchSelection).forEach(key => this.searchSelection[key] = []);
    if (this.searchComponent) {
      this.searchComponent.reset();
    }
    this.titleSearch = '';
  }

  recordSearch(complete = false) {
    if (this.courses.filter !== '') {
      this.searchService.recordSearch({
        text: this._titleSearch,
        type: this.dbName,
        filter: { ...this.searchSelection, tags: this.tagFilter.value }
      }, complete);
    }
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return this.tagFilter.value.length > 0 ||
      Object.entries(this.searchSelection).findIndex(([ field, val ]: any[]) => val.length > 0) > -1 ||
      this.myCoursesFilter.value === 'on' ||
      this.includeIds.length > 0 ?
      ' ' : '';
  }

  updateShelf(newShelf, message: string) {
    this.couchService.put('shelf/' + this.user._id, newShelf).subscribe((res) => {
      newShelf._rev = res.rev;
      this.userService.shelf = newShelf;
      this.setupList(this.courses.data, this.userShelf.courseIds);
      this.planetMessageService.showMessage($localize`${message} myCourses`);
    }, (error) => (error));
  }

  addToCourse(courses) {
    const currentShelf = this.userService.shelf;
    const courseIds = courses.map((data) => {
      return data._id;
    }).concat(currentShelf.courseIds).reduce(dedupeShelfReduce, []);
    const message = courses.length === 1 ?
      $localize`${courses[0].courseTitle} have been added to` :
      $localize`${courses.length} courses have been added to`;
    this.updateShelf(Object.assign({}, currentShelf, { courseIds }), message);
  }

  courseToggle(courseId, type) {
    if (this.isForm) { return; }
    this.coursesService.courseResignAdmission(courseId, type).subscribe((res) => {
      this.setupList(this.courses.data, this.userShelf.courseIds);
      this.countSelectNotEnrolled(this.selection.selected);
    }, (error) => ((error)));
  }

  shareLocal(selectedIds) {
    const localSelections = selectedIds.filter(id => this.isLocalOrNation(id) !== undefined);
    this.shareCourse('push', localSelections);
  }

  shareCourse(type, courseIds) {
    const courses = courseIds.map(courseId => ({ item: findByIdInArray(this.courses.data, courseId), db: this.dbName }));
    const msg = (type === 'pull' ? 'fetch' : 'send');
    const parentType = type === 'pull' ? 'parent' : 'local';
    this.syncService.replicatorsArrayWithTags(courses, type, parentType).pipe(switchMap(replicators =>
      this.syncService.confirmPasswordAndRunReplicators(replicators)
    )).subscribe(() => {
      this.planetMessageService.showMessage($localize`${courses.length} ${this.dbName} queued to ${msg}`);
    }, () => error => this.planetMessageService.showMessage(error));
  }

  openSendCourseDialog() {
    this.dialogsListService.getListAndColumns('communityregistrationrequests', { 'registrationRequest': 'accepted' })
    .pipe(takeUntil(this.onDestroy$))
    .subscribe((planet) => {
      const data = { okClick: this.sendCourse().bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: true,
        ...planet };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data, maxHeight: '500px', width: '600px', autoFocus: false
      });
    });
  }

  sendCourse() {
    return (selected: any) => {
      const coursesToSend = this.selection.selected.map(id => findByIdInArray(this.courses.data, id));
      this.syncService.createChildPullDoc(coursesToSend, 'courses', selected).subscribe(() => {
        const childType = {
          center: selected.length > 1 ? 'nations' : 'nation',
          nation: selected.length > 1 ? 'communities' : 'community'
        }[this.planetType];
        this.planetMessageService.showMessage($localize`Courses queued to push to ${childType}.`);
        this.dialogRef.close();
      }, () => this.planetMessageService.showAlert($localize`There was an error sending these courses`));
    };
  }

  addTagsToSelected({ selected, indeterminate }) {
    this.tagsService.updateManyTags(
      this.courses.data, this.dbName, { selectedIds: this.selection.selected, tagIds: selected, indeterminateIds: indeterminate }
    ).subscribe(() => {
      this.getCourses();
      this.planetMessageService.showMessage($localize`Collections updated`);
    });
  }

  addTag(tag: string) {
    if (tag.trim()) {
      this.tagInputComponent.writeValue([ tag ]);
    }
  }

  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  onExpansionDone(event: any, element: any) {
    element.renderContent = (event.toState === 'expanded');
  }

  isExpanded(element: any): boolean {
    return this.expandedElement === element;
  }

  showPreviewExpand(element: any): boolean {
    if (!element.description || !element.images) {
      return false;
    }
    return element.description.length > calculateMdAdjustedLimit(element.description, this.previewLimit) || element.images.length > 0;
  }

}
