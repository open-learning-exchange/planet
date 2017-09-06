import { AngBellAppPage } from './app.po';
import { browser, by, element } from 'protractor';

describe('ang-bell-app App', () => {
  let page: AngBellAppPage;

  beforeEach(() => {
    page = new AngBellAppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getHeaderText()).toEqual('Planet Learning');
  });
});
