import { AngBellAppPage } from './app.po';

describe('ang-bell-app App', () => {
  let page: AngBellAppPage;

  beforeEach(() => {
    page = new AngBellAppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
