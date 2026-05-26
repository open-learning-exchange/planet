import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

export enum DeviceType {
  SMALL_MOBILE = 'SMALL_MOBILE',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP'
}

export interface DeviceBreakpoints {
  tablet?: number;
  mobile?: number;
  smallMobile?: number;
}

export const DEFAULT_DEVICE_BREAKPOINTS: Required<DeviceBreakpoints> = {
  tablet: 1000,
  mobile: 780,
  smallMobile: 480
};

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  private readonly deviceTypeCache = new Map<string, Observable<DeviceType>>();

  constructor(private breakpointObserver: BreakpointObserver) {}

  public getDeviceType(breakpoints: DeviceBreakpoints = {}): DeviceType {
    const resolvedBreakpoints = this.resolveBreakpoints(breakpoints);

    if (this.breakpointObserver.isMatched(this.maxWidthQuery(resolvedBreakpoints.smallMobile))) {
      return DeviceType.SMALL_MOBILE;
    } else if (this.breakpointObserver.isMatched(this.maxWidthQuery(resolvedBreakpoints.mobile))) {
      return DeviceType.MOBILE;
    } else if (this.breakpointObserver.isMatched(this.maxWidthQuery(resolvedBreakpoints.tablet))) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  public watchDeviceType(breakpoints: DeviceBreakpoints = {}): Observable<DeviceType> {
    const resolvedBreakpoints = this.resolveBreakpoints(breakpoints);
    const cacheKey = this.getCacheKey(resolvedBreakpoints);
    const existingStream = this.deviceTypeCache.get(cacheKey);

    if (existingStream) {
      return existingStream;
    }

    const deviceType$ = this.breakpointObserver.observe([
      this.maxWidthQuery(resolvedBreakpoints.smallMobile),
      this.maxWidthQuery(resolvedBreakpoints.mobile),
      this.maxWidthQuery(resolvedBreakpoints.tablet)
    ]).pipe(
      map(() => this.getDeviceType(resolvedBreakpoints)),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.deviceTypeCache.set(cacheKey, deviceType$);
    return deviceType$;
  }

  public isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  private resolveBreakpoints(breakpoints: DeviceBreakpoints): Required<DeviceBreakpoints> {
    return {
      ...DEFAULT_DEVICE_BREAKPOINTS,
      ...breakpoints
    };
  }

  private maxWidthQuery(width: number): string {
    return `(max-width: ${width}px)`;
  }

  private getCacheKey(breakpoints: Required<DeviceBreakpoints>): string {
    return `${breakpoints.smallMobile}-${breakpoints.mobile}-${breakpoints.tablet}`;
  }

}
