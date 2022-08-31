import { AfterViewInit, Component, OnInit } from '@angular/core';
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
export class LandingNewsComponent implements OnInit, AfterViewInit {
  private reqNum = 0;
  private baseUrl = environment.uplanetAddress;
  private uPlanetCode = environment.uPlanetCode;
  uParentCode = environment.uParentCode;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');
  private defaultOpts = { headers: this.headers, withCredentials: true };
  readonly dbName: string = 'news';
  selectedNews: any = null;
  isError: boolean;
  isLoading: boolean;
  // Evaluate length neccessity
  data: any = {
    length, docs: []
  };

  constructor(
    private http: HttpClient,
    private planetMessageService: PlanetMessageService
  ) { }

  private getNews(opts: any, uPlanetCode: any, uParentCode: any): Observable<any> {
    const url = this.baseUrl + '/pb/' + this.dbName + '/_find';

    // const queryPlanet = uPlanetCode ? { messagePlanetCode: uPlanetCode, viewableBy: 'community' } : { viewableBy: 'community' };
    // const queryParent = uParentCode ? { _id: uParentCode, section: 'community' } : { section: 'community' };

    const queryPlanet = { viewableBy: 'community' };
    const queryParent = { section: 'community' };

    const queryData = JSON.stringify({
      selector: {
        $and: [
          {
            $or: [
              queryPlanet,
              { viewIn: { $elemMatch: queryParent } },
            ],
          },
          {
            replyTo: { $exists: false },
          },
        ],
      },
      skip: 0,
      limit: 1000,
      sort: [{ time: 'desc' }],
    });

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

  useNews() {
    this.isError = false;
    this.isLoading = true;
    this.getNews(this.defaultOpts, this.uPlanetCode, this.uParentCode).subscribe(data => {
      this.data = data.docs;      
      this.isLoading = false;
    }, err => {
      this.isError = true;
      this.isLoading = false;
    });
  }

  ngOnInit() {
    this.useNews();
  }

  ngAfterViewInit() {
   console.log(this.data);
  }

  seeDetails(id: string) {
    const aux = this.data.find(element => element._id === id);
    this.selectedNews = aux;
    console.log(this.selectedNews);
    // Scroll function
  }

  closeDetails() {
    this.selectedNews = null;
  }



}
