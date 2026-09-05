import { Component, Input, OnChanges } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { findPlatform, MemberLink, memberLinkHref, platformLabel, sanitizeMemberLinks } from './social-platforms.constants';

interface DisplayLink {
  href: string;
  icon: string;
  isSvgIcon: boolean;
  isExternal: boolean;
  tooltip: string;
}

@Component({
  selector: 'planet-social-links',
  templateUrl: './social-links.component.html',
  styleUrls: [ './social-links.component.scss' ],
  imports: [ MatIcon, MatTooltip ]
})
export class SocialLinksComponent implements OnChanges {

  @Input() links: MemberLink[] = [];
  displayLinks: DisplayLink[] = [];

  ngOnChanges() {
    this.displayLinks = sanitizeMemberLinks(this.links).map(link => {
      const platform = findPlatform(link.platform);
      return {
        href: memberLinkHref(link),
        icon: platform.icon,
        isSvgIcon: platform.isSvgIcon,
        isExternal: platform.scheme === undefined,
        tooltip: link.label || platformLabel(link.platform)
      };
    });
  }

}
