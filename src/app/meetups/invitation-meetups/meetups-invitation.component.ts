import { Component, Inject, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { FormGroup, FormBuilder, FormControl, FormArray } from '@angular/forms';
import { MatTableDataSource, MatPaginator } from '@angular/material';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: './meetups-invitation.component.html'
})
export class MeetupsInvitationComponent {

  public title: string;
  public fields: any;
  public modalForm: any;
  usersTable = false;
  invitation: FormGroup;
  displayedColumns = [ '_id', 'name' ];
  users: any = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.users.filter = filterValue;
  }

  constructor(
    public dialogRef: MatDialogRef<MeetupsInvitationComponent>,
    private fb: FormBuilder,
    private couchService: CouchService,
    private userService: UserService,
    private changeDetector: ChangeDetectorRef
    ) {
    this.createFormGroup();
    this.users.filterPredicate = filterSpecificFields([ 'name' ]);
  }

  getAlluser() {
    this.couchService.allDocs('_users').subscribe(user => {
      const filterusers = user.filter((filteruser: any) => {
        return filteruser._id !== this.userService.get()._id;
      });
      this.users.data = filterusers;
    });
  }

  onSubmit(mForm, dialogRef ) {
    if (mForm.valid) {
      dialogRef.close(mForm.value);
    } else {
      this.markFormAsTouched(mForm);
    }
  }

  onChange(event) {
    if (event === 'Member') {
      this.usersTable = true;
      this.getAlluser();
      this.changeDetector.detectChanges();
      this.users.paginator = this.paginator;
    } else {
      this.usersTable = false;
    }
  }

  createFormGroup() {
    this.invitation = this.fb.group({
      invitemember: '',
      myselectedMember: this.fb.array([]),
    });
  }

  onMemberSelected(myselectedMember: string, isChecked: boolean) {
    const myMemberSelectedArray = <FormArray>this.invitation.controls.myselectedMember;
    if (isChecked) {
      myMemberSelectedArray.push(new FormControl(myselectedMember));
    } else {
      myMemberSelectedArray.removeAt(myMemberSelectedArray.controls.findIndex(x => x.value === myselectedMember));
    }
  }

}
