import { Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';

import 'rxjs/add/operator/toPromise';

@Injectable()
export class CouchService {
    private headers = new Headers({'Content-Type':'application/json'});
    private baseUrl = 'http://127.0.0.1:5984/';
    
    constructor(private http: Http) {}
    
    put(db:string,data:any): Promise<any> {
        const url = this.baseUrl + db;
        const putData = data ? JSON.stringify(data) : '';
        
        return this.http
            .put(url,putData,{headers:this.headers})
            .toPromise()
            .then(this.handleRes)
            .catch(this.handleError);
    }
    
    post(db:string,data:any,opts?:any): Promise<any> {
        const url = this.baseUrl + db;
        const postData = data ? JSON.stringify(data) : '';
        opts = Object.assign({},{headers:this.headers},opts) || {headers:this.headers};
        
        return this.http
            .post(url,postData,opts)
            .toPromise()
            .then(this.handleRes)
            .catch(this.handleError);
    }
    
    get(db:string,opts?:any): Promise<any> {
        const url = this.baseUrl + db;
        opts = opts || {};
        
        return this.http
            .get(url,opts)
            .toPromise()
            .then(this.handleRes)
            .catch(this.handleError);
    }
    
    delete(db:string,opts?:any): Promise<any> {
        const url = this.baseUrl + db;
        opts = opts || {};
        
        return this.http
            .delete(url,opts)
            .toPromise()
            .then(this.handleRes)
            .catch(this.handleError);
    }
    
    private handleRes = (res:any) => res.json();
    
    private handleError(error: any): Promise<any> {
        return Promise.reject(error.json());
    }
    
}