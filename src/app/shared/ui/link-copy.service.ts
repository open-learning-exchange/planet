import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { PlanetMessageService } from './planet-message.service';

interface LinkCopyMessages {
  success: string;
  failure: string;
}

@Injectable({
  providedIn: 'root'
})
export class LinkCopyService {
  constructor(
    private clipboard: Clipboard,
    private location: Location,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) { }

  copyLink(commands: any[], messages: LinkCopyMessages): boolean {
    const path = this.router.serializeUrl(this.router.createUrlTree(commands));
    const externalPath = this.location.prepareExternalUrl(path);
    const copied = this.clipboard.copy(new URL(externalPath, window.location.origin).href);

    if (copied) {
      this.planetMessageService.showMessage(messages.success);
    } else {
      this.planetMessageService.showAlert(messages.failure);
    }

    return copied;
  }
}
