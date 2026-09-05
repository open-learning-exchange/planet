export interface SocialPlatform {
  value: string;
  label: string;
  // Material icon ligature when isSvgIcon is false, otherwise the registered svgIcon name
  icon: string;
  isSvgIcon: boolean;
  scheme?: 'mailto' | 'tel';
  placeholder?: string;
}

// Platforms shared by community links (Services tab) and member links (member tiles/profile).
export const socialPlatforms: SocialPlatform[] = [
  { value: 'instagram', label: 'Instagram', icon: 'instagram', isSvgIcon: true, placeholder: 'https://instagram.com/...' },
  { value: 'facebook', label: 'Facebook', icon: 'facebook', isSvgIcon: true, placeholder: 'https://facebook.com/...' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', isSvgIcon: true, placeholder: 'https://wa.me/...' },
  { value: 'discord', label: 'Discord', icon: 'discord', isSvgIcon: true, placeholder: 'https://discord.gg/...' },
  { value: 'x', label: 'X (Twitter)', icon: 'x', isSvgIcon: true, placeholder: 'https://x.com/...' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube', isSvgIcon: true, placeholder: 'https://youtube.com/...' },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok', isSvgIcon: true, placeholder: 'https://tiktok.com/@...' },
  { value: 'website', label: $localize`Website`, icon: 'public', isSvgIcon: false, placeholder: 'https://...' }
];

// Only offered on member links: adding one is the member's own opt-in to publishing that contact.
export const contactPlatforms: SocialPlatform[] = [
  { value: 'email', label: $localize`Email`, icon: 'mail', isSvgIcon: false, scheme: 'mailto', placeholder: 'name@example.org' },
  { value: 'phone', label: $localize`Phone`, icon: 'phone', isSvgIcon: false, scheme: 'tel', placeholder: '+1 555 0100' }
];

export const memberLinkPlatforms: SocialPlatform[] = [ ...socialPlatforms, ...contactPlatforms ];

export const maxMemberLinks = 6;

export interface MemberLink {
  platform: string;
  url: string;
  label?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[\d\s().-]{4,20}$/;

export const findPlatform = (value: string, platforms: SocialPlatform[] = memberLinkPlatforms): SocialPlatform | undefined =>
  platforms.find(platform => platform.value === value);

export const platformLabel = (value: string, platforms: SocialPlatform[] = memberLinkPlatforms): string =>
  findPlatform(value, platforms)?.label || '';

// Returns a safe href for a member link, or an empty string when the value cannot be trusted.
// Anything outside https/http/mailto/tel is rejected so a stored `javascript:` value can never
// reach an anchor's href.
export const memberLinkHref = ({ platform, url }: MemberLink): string => {
  const value = (url || '').trim();
  if (!value) {
    return '';
  }
  const scheme = findPlatform(platform)?.scheme;
  if (scheme === 'mailto') {
    return emailRegex.test(value) ? `mailto:${value}` : '';
  }
  if (scheme === 'tel') {
    return phoneRegex.test(value) ? `tel:${value.replace(/[\s().-]/g, '')}` : '';
  }
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? value : '';
  } catch (_) {
    return '';
  }
};

export const isValidMemberLinkValue = (link: MemberLink): boolean => memberLinkHref(link) !== '';

// Drops malformed entries so a hand-edited or partially synced user doc cannot break the tiles.
export const sanitizeMemberLinks = (links: any): MemberLink[] => (
  Array.isArray(links) ?
    links
      .filter(link => link && typeof link.platform === 'string' && typeof link.url === 'string')
      .map(({ platform, url, label }) => ({ platform, url: url.trim(), label: (label || '').trim() }))
      .filter(link => !!findPlatform(link.platform) && isValidMemberLinkValue(link))
      .slice(0, maxMemberLinks) :
    []
);
