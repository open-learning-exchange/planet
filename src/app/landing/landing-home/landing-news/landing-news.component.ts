import { Component, OnInit } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { CouchService } from '../../../shared/couchdb.service';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'planet-landing-news',
  templateUrl: './landing-news.component.html',
  styleUrls: [ './landing-news.scss' ]
})
export class LandingNewsComponent implements OnInit {
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
  data: any = {
    docs: []
  };

  constructor(
    private http: HttpClient,
    private couchService: CouchService
  ) { }

  private getNews(opts: any, uPlanetCode: any, uParentCode: any): Observable<any> {
    const url = this.baseUrl + '/pb/' + this.dbName + '/_find';

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
      sort: [ { time: 'desc' } ],
    });

    let httpReq: Observable<any>;
    httpReq = this.http.post(url, queryData, opts);
    return this.couchService.formatHttpReq(httpReq, 'post', this.reqNum);
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

  seeDetails(id: string) {
    const aux = this.data.find(element => element._id === id);
    this.selectedNews = aux;
  }

  closeDetails() {
    this.selectedNews = null;
  }

}
