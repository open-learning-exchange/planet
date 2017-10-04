import { browser, by, element } from 'protractor';

export class LoginPage {
  navigateTo() {
    return browser.get('/login');
  }

  getHeaderText() {
    return element(by.css('planet-app h1')).getText();
  }

  getUsernameInput() {
    return element(by.css('input[name=name]'));
  }

  getPasswordInput() {
    return element(by.css('input[name=password]'));
  }

  clickSignin() {
    return element(by.buttonText('SIGN-IN')).click();
  }

}
