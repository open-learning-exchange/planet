import { maxMemberLinks, memberLinkHref, sanitizeMemberLinks } from './social-platforms.constants';

describe('member link helpers', () => {

  it('builds hrefs for the contact platforms', () => {
    expect(memberLinkHref({ platform: 'email', url: 'leader@ole.org' })).toBe('mailto:leader@ole.org');
    expect(memberLinkHref({ platform: 'phone', url: '+1 (555) 010-0100' })).toBe('tel:+15550100100');
  });

  it('rejects contact values that are not an address or a number', () => {
    expect(memberLinkHref({ platform: 'email', url: 'not an address' })).toBe('');
    expect(memberLinkHref({ platform: 'phone', url: 'call me' })).toBe('');
  });

  it('only trusts http and https for web links', () => {
    expect(memberLinkHref({ platform: 'website', url: 'https://ole.org/' })).toBe('https://ole.org/');
    expect(memberLinkHref({ platform: 'facebook', url: 'javascript:alert(1)' })).toBe('');
    expect(memberLinkHref({ platform: 'website', url: 'data:text/html,<script></script>' })).toBe('');
    expect(memberLinkHref({ platform: 'website', url: 'ole.org' })).toBe('');
  });

  it('drops entries that are malformed, unknown, or past the maximum', () => {
    const links = sanitizeMemberLinks([
      null,
      { platform: 'website' },
      { platform: 'myspace', url: 'https://myspace.com/ole' },
      { platform: 'website', url: 'javascript:alert(1)' },
      { platform: 'x', url: '  https://x.com/ole  ', label: '  OLE  ' },
      ...Array.from({ length: maxMemberLinks }, () => ({ platform: 'website', url: 'https://ole.org/' }))
    ]);

    expect(links.length).toBe(maxMemberLinks);
    expect(links[0]).toEqual({ platform: 'x', url: 'https://x.com/ole', label: 'OLE' });
  });

  it('returns an empty list when the stored value is not an array', () => {
    expect(sanitizeMemberLinks(undefined)).toEqual([]);
    expect(sanitizeMemberLinks('https://ole.org/')).toEqual([]);
  });

});
