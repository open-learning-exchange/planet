import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-courses.component.html'
})
export class DialogsAddCoursesComponent {

  @ViewChild(CoursesComponent, { static: false }) coursesComponent: CoursesComponent;
  view = 'courses';

  constructor(
    public dialogRef: MatDialogRef<DialogsAddCoursesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    console.log(this.data.excludeIds);
   }

  ok() {
    this.dialogsLoadingService.start();
    switch (this.view) {
      case 'courses':
        this.addExistingCourses();
        break;
    }
  }

  addExistingCourses() {
    const tableData = this.coursesComponent.courses.data;
    const selection = this.coursesComponent.selection.selected;
    const courses = tableData.filter((course: any) => selection.indexOf(course._id) > -1);
    this.data.okClick(courses);
  }

}
