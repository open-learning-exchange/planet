import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UserService } from '../../shared/user.service';
import { map, catchError } from 'rxjs/operators';

@Component({
  templateUrl: './resources-rating.component.html',
  selector: 'planet-resources-rating'
})
export class ResourcesRatingComponent implements OnChanges {

  @Input() rating: any = { userRating: {} };
  @Input() resourceId: string;
  @Output() update = new EventEmitter();
  rateForm: FormGroup;
  stackedBarData = [];

  private dbName = 'ratings';

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private planetMessage: PlanetMessageService,
    private userService: UserService
  ) {
    this.rateForm = this.fb.group({
      rate: this.rating.userRating.rate || 0
    });
  }

  ngOnChanges() {
    // After any changes to ratings ensures all properties are set
    this.rating = Object.assign({ rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} }, this.rating);
    this.stackedBarData = [
      { class: 'primary-color', amount: this.rating.maleRating },
      { class: 'primary-light-color',
        amount: this.rating.totalRating === 0 ? 1
          : this.rating.totalRating - this.rating.maleRating - this.rating.femaleRating,
        noLabel: true
      },
      { class: 'accent-color', amount: this.rating.femaleRating, align: 'right' }
    ];
    this.rateForm.setValue({
      rate: this.rating.userRating.rate || 0
    });
  }

  onStarClick() {
    this.updateRating().subscribe(res => {
      this.rating.userRating._rev = res.rev;
    }, (err) => {
      this.planetMessage.showAlert('There was an issue with your rating');
      this.rateForm.setValue({ rate: this.rating.userRating.rate || 0 });
    });
  }

  updateRating() {
    // Later parameters of Object.assign will overwrite values from previous objects
    const newRating = Object.assign({
      type: 'resource',
      item: this.resourceId,
      user: this.userService.get()
    }, this.rating.userRating, this.rateForm.value, {
      time: Date.now()
    });
    let couchRequest = this.couchService.post,
      couchUrl = this.dbName;
    if (newRating._rev) {
      couchRequest = this.couchService.put;
      couchUrl = couchUrl + '/' + newRating._id;
    }
    // Use call because 'this' will be undefined
    return couchRequest.call(this.couchService, couchUrl, newRating).pipe(map((res) => {
      this.update.emit();
      return res;
    }));
  }

}
