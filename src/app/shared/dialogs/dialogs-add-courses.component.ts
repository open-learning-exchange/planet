import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-courses.component.html'
})
export class DialogsAddCoursesComponent implements AfterViewInit {

  @ViewChild(CoursesComponent) coursesComponent: CoursesComponent;
  okDisabled = true;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddCoursesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngAfterViewInit() {
    this.coursesComponent.selection.changed.subscribe((selection) => {
      this.okDisabled = selection.source.selected.length === 0;
    });
  }

  ok() {
    if (!this.data.noSpinner) {
      this.dialogsLoadingService.start();
    }
    this.addExistingCourses();
  }

  addExistingCourses() {
    const tableData = this.coursesComponent.courses.data;
    const selection = this.coursesComponent.selection.selected;
    const courses = tableData.filter((course: any) => selection.indexOf(course._id) > -1);
    this.data.okClick(courses);
  }

}
