import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'time'
})
export class TimePipe implements PipeTransform {
  // converts time in ms to hh:mm:ss
  transform(time: number) {
    const calcTime = (totalTime: number, timeText: string = '', conversion: number = 2) => {
      const divisor = (1000 * Math.pow(60, conversion));
      const newTimeText = `${timeText}${Math.floor(totalTime / divisor).toFixed(0).padStart(2, '0')}${conversion > 0 ? ':' : ''}`;
      const newTime = totalTime % divisor;
      if (conversion === 0) {
        return newTimeText;
      }
      return calcTime(newTime, newTimeText, conversion - 1);
    };
    return calcTime(time || 0);
  }
}
