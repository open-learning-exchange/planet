import { Pipe, PipeTransform } from '@angular/core';
import { fullName } from '@shared/utils';

@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(user: any): string {
    return fullName(user);
  }
}
