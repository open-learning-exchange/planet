import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'plaintext' })
export class PlainTextPipe implements PipeTransform {
  transform(value: string) {
    return value.replace(/[*#>]/g, '');
  }
}
