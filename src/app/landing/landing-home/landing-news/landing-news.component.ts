import { Component, OnInit } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { debug } from '../../../debug-operator';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'planet-landing-news',
  templateUrl: './landing-news.component.html',
  styleUrls: ['./landing-news.scss']
})
export class LandingNewsComponent implements OnInit {
  private reqNum = 0;
  // private baseUrl = environment.uplanetAddress;
  private baseUrl = environment.couchAddress;
  private uPlanetCode = environment.uPlanetCode;
  uParentCode = environment.uParentCode;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  readonly dbName: string = "news";
  selectedNews: any;
  isError: boolean;
  isLoading: boolean;

  news: any[] = [];

  constructor(
    private http: HttpClient,
    private planetMessageService: PlanetMessageService
  ) { }

  private getNews(opts : any, uPlanetCode: any, uParentCode: any): Observable<any> {
    const url = this.baseUrl + '/pb/' + this.dbName + "/_find";

    const queryPlanet = uPlanetCode ? {messagePlanetCode: uPlanetCode, viewableBy: 'community'} : {viewableBy: 'community'};
    const queryParent = uParentCode ? {_id: uParentCode, section: 'community'} : {section: 'community'};

    const queryData = JSON.stringify({
      selector: {
        $and: [
          {
            $or: [
              queryPlanet,
              {viewIn: {$elemMatch: queryParent}},
            ],
          },
          {
            replyTo: {$exists: false},
          },
        ],
      }
    })
    
    let httpReq: Observable<any>;
    httpReq = this.http.post(url, queryData, opts);
    return httpReq
      .pipe(debug('Http ' + 'post' + ' ' + this.reqNum + ' request'))
      .pipe(catchError(err => {
        if (err.status === 403) {
          this.planetMessageService.showAlert($localize`You are not authorized. Please contact administrator.`);
        }
        return throwError(err);
      }));
  }

  ngOnInit() {
    this.getNews(this.defaultOpts, this.uPlanetCode, this.uParentCode).subscribe(data => {
      console.log(data);
    });
  }

}
