import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';

@Component({
  selector: 'planet-courses-step',
  templateUrl: 'courses-step.component.html'
})
export class CoursesStepComponent implements OnChanges {

  @Input() stepInfo: any = {
    id: '',
    stepTitle: '',
    description: '',
    attachment: ''
  };
  @Output() stepInfoChange = new EventEmitter<any>();
  @Input() stepNum: number;
  @Input() stepCount: number;
  @Output() examClick = new EventEmitter<any>();
  @Output() stepOrder = new EventEmitter<any>();
  @Output() stepRemove = new EventEmitter<any>();

  stepForm: FormGroup;
  dialogRef: MatDialogRef<DialogsListComponent>;
  attachment: any;

  constructor(
    private fb: FormBuilder,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog
  ) {}

  ngOnChanges() {
    this.stepForm = this.fb.group(this.stepInfo);
    this.attachment = this.stepForm.controls.attachment.value;
  }

  stepChange() {
    this.stepInfoChange.emit(this.stepForm.value);
  }

  addExam(stepNum: number) {
    this.examClick.emit(stepNum - 1);
  }

  deleteStep() {
    this.stepRemove.emit();
  }

  attachItem(db: string) {
    this.dialogsListService.getListAndColumns(db).subscribe((res) => {
      const data = { okClick: this.dialogOkClick(db).bind(this),
        filterPredicate: filterSpecificFields([ 'title' ]),
        ...res };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(db: string) {
    return (item: any) => {
      this.stepForm.patchValue({ attachment: { doc: item, type: db } });
      this.stepChange();
      this.dialogRef.close();
    };
  }

  moveUp() {
    this.stepOrder.emit(this.stepNum - 2);
  }

  moveDown() {
    this.stepOrder.emit(this.stepNum);
  }

}
