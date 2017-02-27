var Application = require('spectron').Application
var assert = require('assert')


describe('application launch', function () {
  this.timeout(10000)

  beforeEach(function () {
    this.app = new Application({
      path: '/Users/alex/dev/nodejs/guinstabot/app/dist/mac/InstaBOT.app/Contents/MacOS/InstaBOT'
    })
    return this.app.start()
  })
// FIX
  // afterEach(function () {
  //   if (this.app && this.app.isRunning()) {
  //     return this.app.stop();
  //   }
  // })

  it('shows an initial window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 2)
    })
  })
})

