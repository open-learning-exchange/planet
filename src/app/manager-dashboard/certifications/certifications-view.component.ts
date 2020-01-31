import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { CertificationsService } from './certifications.service';
import { TableState } from '../../users/users-table.component';

@Component({
  templateUrl: './certifications-view.component.html'
})
export class CertificationsViewComponent implements OnInit {

  certification: any = { courseIds: [] };
  eligibleMembers: any[] = [];
  eligibleTableState = new TableState();

  constructor(
    private route: ActivatedRoute,
    private certificationsService: CertificationsService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => this.certificationsService.getCertification(paramMap.get('id')))
    ).subscribe(certification => this.certification = certification);
  }

}
