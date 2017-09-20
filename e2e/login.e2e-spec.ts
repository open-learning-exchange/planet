import { LoginPage } from './login.po';
import { browser, by, element } from 'protractor';
import fs = require('fs');

describe('Login', () => {
  let page: LoginPage;

  beforeEach(() => {
    page = new LoginPage();
  });

  it('should display page header', () => {
    page.navigateTo();
    expect(page.getHeaderText()).toEqual('Planet Learning');
  });

  it('should login', () => {
    page.navigateTo();
    let userInput = page.getUsernameInput();
    let passInput = page.getPasswordInput();
    userInput.sendKeys(browser.params.user);
    passInput.sendKeys('e2e');
    page.clickSignin();
    browser.getCurrentUrl().then((url) => {
      expect(url).toEqual('http://0.0.0.0:49152/');
    });
  });

});
