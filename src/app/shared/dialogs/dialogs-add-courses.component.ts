import { Component, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-courses.component.html'
})
export class DialogsAddCoursesComponent {

  @ViewChild(CoursesComponent, { static: false }) coursesComponent: CoursesComponent;
  okDisabled = true;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddCoursesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngAfterViewChecked() {
    const okDisabled =  !this.coursesComponent || !this.coursesComponent.selection.selected.length;
    if (this.okDisabled !== okDisabled) {
      this.okDisabled =  okDisabled;
      this.cdRef.detectChanges();
    }
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
