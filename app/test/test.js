var helpers = require('./global-setup')
var path = require('path')
var fs = require('fs');
var os = require('os');
var expect = require('chai').expect;

var describe = global.describe
var it = global.it
var beforeEach = global.beforeEach
var afterEach = global.afterEach

var appPath = path.resolve(__dirname, '../'); 
console.log(appPath);

var config = require('../config/default');
var softname = config.App.softname;
var electronPath = path.resolve('/usr/local/bin/electron');

describe('launch application', function () {
  helpers.setupTimeout(this)

  var app = null

  beforeEach(function () {
    return helpers.startApplication({
      path: electronPath,
      args: [appPath]
    }).then(function (startedApp) { app = startedApp })
  })

  afterEach(function () {
    return helpers.stopApplication(app)
  })
 
  it('opens a window and webcontents finish loading', function () {
    return app.client.waitUntilWindowLoaded()
      .browserWindow.isDevToolsOpened().should.eventually.be.true
      .windowByIndex(1)
      .waitForVisible('#table1').should.eventually.be.true
      .browserWindow.focus()
      .getWindowCount().should.eventually.equal(1)
      .browserWindow.isMinimized().should.eventually.be.false
      .browserWindow.isVisible().should.eventually.be.true
      .browserWindow.isFocused().should.eventually.be.true
      .browserWindow.getBounds().should.eventually.have.property('width').and.be.above(0)
      .browserWindow.getBounds().should.eventually.have.property('height').and.be.above(0)
  })

  it('creates correct title, home, db directory', function () {
    var home = path.join(os.tmpdir(), softname)
    var dbdir = path.join(os.tmpdir(), softname, 'levdb')
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1').should.eventually.be.true
      .webContents.getTitle().should.eventually.equal(softname)
      .then(function() {
        expect(fs.existsSync(home)).to.equal(true)
        expect(fs.existsSync(dbdir)).to.equal(true)
      })
  })
})


describe('navigation menu', function () {
  helpers.setupTimeout(this)

  var app = null

  beforeEach(function () {
    return helpers.startApplication({
      path: electronPath,
      args: [appPath]
    }).then(function (startedApp) { app = startedApp })
  })

  afterEach(function () {
    return helpers.stopApplication(app)
  })

  it('shows correct menu for no rows selected', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1').should.eventually.be.true
      .rightClick("#table1", 10, 10) 
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .then(function() {
        app.client.getText('#context-menu > ul > li').then(function (text) {
          [ 'Добавить аккаунты', 
            'Добавить задание'  ].forEach(function(item) {
            expect(text.indexOf(item)).to.be.above(0)
          })
        })
      })
  })

  it('shows correct menu for one task row selected', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(1)", 10, 10)
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .then(function() {
        app.client.getText('#context-menu > ul > li').then(function (text) {
          [ 'Старт', 
            'Редактировать задание', 
            'Удалить выделенное', 
            'Добавить аккаунты', 
            'Показать логи' ].forEach(function(item) {
            expect(text.indexOf(item)).to.be.above(0)
          })
        })
      })
  })

  it('shows correct menu for one user row with task [Shift]', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(2)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(2)", 10, 10)
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .then(function() {
        app.client.getText('#context-menu > ul > li').then(function (text) {
          [ 'Старт',
            'Редактировать аккаунт',
            'Добавить задание',
            'Редактировать задание',
            'Проверка аккаунта',
            'Удалить выделенное',
            'Добавить аккаунты',
            'Показать логи' ].forEach(function(item) {
            expect(text.indexOf(item)).to.be.above(0)
          })
        })
      })
  })

  it('shows correct menu for two user rows with tasks each [Shift]', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(2)').should.eventually.be.true
      .waitForVisible('#table1 tbody tr:nth-child(3)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(2)", 10, 10)
      .keys('Shift')
      .click("#table1 tbody tr:nth-child(3)", 10, 10)
      .keys('NULL')
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .then(function() {
        app.client.getText('#context-menu > ul > li').then(function (text) {
          [ 'Старт',
            'Добавить задание',
            'Проверка аккаунта',
            'Удалить выделенное',
            'Добавить аккаунты',
            'Показать логи' ].forEach(function(item) {
            expect(text.indexOf(item)).to.be.above(0)
          })
        })
      })
  })
  
  it('shows correct menu for row user and row task [Ctrl+A]', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(2)').should.eventually.be.true
      .waitForVisible('#table1 tbody tr:nth-child(3)').should.eventually.be.true
      .keys(['Control', 'a', 'NULL'])
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .then(function() {
        app.client.getText('#context-menu > ul > li').then(function (text) {
          [ 'Старт',
            'Удалить выделенное',
            'Добавить аккаунты',
            'Показать логи' ].forEach(function(item) {
            expect(text.indexOf(item)).to.be.above(0)
          })
        })
      })
  })

})


describe.only('possible to add users from file', function () {

  helpers.setupTimeout(this)

  var app = null

  beforeEach(function () {
    return helpers.startApplication({
      path: electronPath,
      args: [appPath]
    }).then(function (startedApp) { app = startedApp })
  })

  afterEach(function () {
    return helpers.stopApplication(app)
  })

  it('possible to add users from file', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1').should.eventually.be.true
      .rightClick("#table1", 10, 10) 
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .click('#context-menu > ul > li:nth-child(8)', 5, 5)
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 3
        })
      })
      .windowByIndex(2)
      .waitForVisible('#add_accounts_form').should.eventually.be.true
      .webContents.getTitle().should.eventually.equal('Добавить аккаунты | ' + softname)
      .setValue('#add_acc_txt_file', '/Users/alex/dev/nodejs/guinstabot/app/test/accounts')
      .click('button[type="submit"]')
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 1
        })
      })
      .windowByIndex(0)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .then(function() {
        app.client.getText('#table1 > tbody > tr').then(function (text) {
          expect(text.length).to.equal(2)
        })
      })
  })

  it('possible to check logs for user account', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(1)", 10, 10)
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .click('#context-menu > ul > li:nth-child(9)', 5, 5)
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 3
        })
      })
      .windowByIndex(2)
      .waitForVisible('#text').should.eventually.be.true
      .webContents.getTitle().should.eventually.equal(`Лог ratm9111 | ${softname}`)

  })

  it('possible to edit user credentials', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(1)", 10, 10)
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .click('#context-menu > ul > li:nth-child(3)', 5, 5)
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 3
        })
      })
      .windowByIndex(2)
      .waitForVisible('#edit_form').should.eventually.be.true
      .webContents.getTitle().should.eventually.equal('Редактирование аккаунта | ' + softname)
      .setValue('#username', 'ratmChanged')
      .click('button[type="submit"]')
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 1
        })
      })
      .windowByIndex(0)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .then(function() {
        app.client.getText('#table1 > tbody > tr').then(function (text) {
          expect(text.length).to.equal(2)
        })
      })
  })


  it('possible to add task to the user record', function () {
    return app.client.waitUntilWindowLoaded()
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 2
        })
      })
      .windowByIndex(1)
      .waitForVisible('#table1 tbody tr:nth-child(1)').should.eventually.be.true
      .click("#table1 tbody tr:nth-child(1)", 10, 10)
      .rightClick("#table1", 10, 10)
      .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
      .click('#context-menu > ul > li:nth-child(4)', 5, 5)
      .waitUntil(function () {
        return this.getWindowCount().then(function (count) {
          return count === 3
        })
      })
      .windowByIndex(2)
      .waitForVisible('#parse_concurrents_tab').should.eventually.be.true
      .webContents.getTitle().should.eventually.equal('Добавление задания | ' + softname)
  })

  it('possible to delete all exist records [Ctrl+A]', function () {
  return app.client.waitUntilWindowLoaded()
    .waitUntil(function () {
      return this.getWindowCount().then(function (count) {
        return count === 2
      })
    })
    .windowByIndex(1)
    .waitForVisible('#table1 > tbody > tr:nth-child(1)').should.eventually.be.true
    .keys(['Control', 'a', 'NULL'])
    .rightClick("#table1", 10, 10)
    .getAttribute('#context-menu', 'class').should.eventually.equal('context-menu context-menu--active')
    .click('#context-menu > ul > li:nth-child(7)', 5, 5)
    .then(function() {
      app.client.getText('#table1 > tbody > tr').then(function (text) {
        expect(text.length).to.equal(0)
      })
    })
  })
  
})
