
global.chai = require('chai');
global.expect = chai.expect;

var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var Mocha = require('mocha'),
    sinon = require('sinon');

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'sandbox'],
  useFakeTimers: false,
  useFakeServer: false
};

var loadFiles = Mocha.prototype.loadFiles;
Mocha.prototype.loadFiles = function() {
  this.suite.beforeEach(function() {
    var config = sinon.getConfig(sinon.config);
    config.injectInto = this;
    this.sandbox = sinon.sandbox.create(config);
  });
  this.suite.afterEach(function() {
    this.sandbox.verifyAndRestore();
  });

  return loadFiles.apply(this);
};

