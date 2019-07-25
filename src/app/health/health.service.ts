import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  healthDetail: any;
  userDetail: any = { name: '' };

}
