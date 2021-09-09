import { Component, Inject, OnChanges } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { DialogsListComponent } from './dialogs-list.component';
import { StateService } from '../state.service';
import { NewsService } from '../../news/news.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { planetAndParentId } from '../../manager-dashboard/reports/reports.utils';

@Component({
  templateUrl: './dialogs-form.component.html',
  styles: [ `
    .checkbox-wrapper:last-child {
      margin: 0 0 20px 0;
    }
  ` ]
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public comments = [];
  public modalForm: FormGroup;
  passwordVisibility = new Map();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;
  configuration = this.stateService.configuration;
  isRoot = true;
  userStatus = 'member';
  onDestroy$ = new Subject<void>();

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsFormComponent>,
    private dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsListService: DialogsListService,
    private stateService: StateService,
    private newsService: NewsService,
    private route: ActivatedRoute,
  ) {
    if (this.data && this.data.formGroup) {
      this.modalForm = this.data.formGroup instanceof FormGroup ?
        this.data.formGroup :
        this.fb.group(this.data.formGroup, this.data.formOptions || {});
      this.title = this.data.title;
      this.fields = this.data.fields;
      this.isSpinnerOk = false;
      this.report = this.data.report;
      this.teamId = this.data.teamId;
      this.disableIfInvalid = this.data.disableIfInvalid || this.disableIfInvalid;
    }
  }

  ngOnInit() {
    // this.route.paramMap.subscribe((params: ParamMap) => {
    //   this.initTeam(this.teamId);
    //   console.log(this.news);
    //   this.comments = this.filterCommentsFromNews(this.report, this.news);
    // });
    // this.newsService.getNews().subscribe(news:any => this.news = news.docs);
    // this.initTeam(this.teamId);
    console.log('team id', this.teamId)
    console.log('report', this.report)
    console.log('news', this.news)
    console.log('comments', this.comments )
  }
  
  ngOnChanges() {
    // this.initTeam(this.teamId)
  }
  
    initTeam(teamId: string) {
      this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
        .subscribe(news => {
          this.news = news.map(post => ({
          ...post, public: ((post.doc.viewIn || []).find(view => view._id === teamId) || {}).public
        }))
        // this.news = news;
        this.comments = this.filterCommentsFromNews(this.report, this.news);
      });
    }

  filterCommentsFromNews (report, news) {
    return news.filter(item => item.doc.reportId === report._id)
  }

  onSubmit(mForm, dialog) {
    if (!mForm.valid) {
      this.markFormAsTouched(mForm);
      return;
    }
    if (this.data && this.data.onSubmit) {
      this.dialogsLoadingService.start();
      this.data.onSubmit(mForm.value, mForm);
    }
    if (!this.data || this.data.closeOnSubmit === true) {
      this.dialogsLoadingService.stop();
      dialog.close(mForm.value);
    }
  }

  toggleAdd(data) {
    this.isRoot = data._id === 'root';
  }


  togglePasswordVisibility(fieldName) {
    const visibility = this.passwordVisibility.get(fieldName) || false;
    this.passwordVisibility.set(fieldName, !visibility);
  }

  openDialog(field) {
    const initialSelection = this.modalForm.controls[field.name].value.map((value: any) => value._id);
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData(field.db, 'title', this.dialogOkClick(field).bind(this), initialSelection).subscribe((data) => {
      this.dialogsLoadingService.stop();
      this.dialogListRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(field) {
    return (selection) => {
      this.modalForm.controls[field.name].setValue(selection);
      this.dialogListRef.close();
      this.modalForm.markAsDirty();
    };
  }

  isValid() {
    return this.modalForm.status === 'VALID';
  }

  isDirty() {
    return this.modalForm.dirty;
  }

}
