import { browser, by, element } from 'protractor';

export class AngBellAppPage {
  navigateTo() {
    return browser.get('/login');
  }

  getHeaderText() {
    return element(by.css('planet h1')).getText();
  }
}
