import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EasymdeLoaderService {
  private loadPromise: Promise<any> | null = null;
  private stylesheetPromise: Promise<void> | null = null;

  load(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).EasyMDE) {
      return Promise.resolve((window as any).EasyMDE);
    }

    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        await this.ensureStylesheet();
        const module = await import('easymde');
        const easyMde = module.default || module;
        if (typeof window !== 'undefined') {
          (window as any).EasyMDE = easyMde;
        }
        return easyMde;
      })();
    }

    return this.loadPromise;
  }

  private ensureStylesheet(): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.resolve();
    }

    if (this.stylesheetPromise) {
      return this.stylesheetPromise;
    }

    const existingLink = document.querySelector<HTMLLinkElement>('link[data-easymde-stylesheet]');
    if (existingLink) {
      if (existingLink.sheet) {
        return Promise.resolve();
      }

      this.stylesheetPromise = new Promise<void>((resolve, reject) => {
        existingLink.addEventListener('load', () => {
          this.stylesheetPromise = null;
          resolve();
        }, { once: true });
        existingLink.addEventListener('error', () => {
          this.stylesheetPromise = null;
          reject(new Error('Failed to load EasyMDE stylesheet.'));
        }, { once: true });
      });

      return this.stylesheetPromise;
    }

    this.stylesheetPromise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/easymde/easymde.min.css';
      link.setAttribute('data-easymde-stylesheet', 'true');
      link.onload = () => {
        this.stylesheetPromise = null;
        resolve();
      };
      link.onerror = () => {
        this.stylesheetPromise = null;
        reject(new Error('Failed to load EasyMDE stylesheet.'));
      };
      document.head.appendChild(link);
    });

    return this.stylesheetPromise;
  }
}
