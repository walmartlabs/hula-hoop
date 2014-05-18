var clientSide = require('../../lib/api/client-side'),
    fs = require('fs'),
    resourceLoader = require('../../lib/api/resource-loader');

describe('client-side', function() {
  afterEach(function() {
    clientSide.reset();
  });

  describe('#loadHtml', function() {
    var content;
    beforeEach(function() {
      this.stub(resourceLoader, 'asset', function() {
        return 'foo';
      });
      this.stub(resourceLoader, 'index', function(branch) {
        return branch;
      });
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, content);
      });
    });

    it('should load index from resource loader', function() {
      content = 'foo<script></script><script></script>bar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(resourceLoader.index).to.have.been.calledOnce;

        expect(data).to.eql([
          'foo',
          '<script></script><script></script>bar'
        ]);
      });
    });
    it('should handle no script tags', function() {
      content = 'foobar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          'foobar'
        ]);
      });
    });
    it('should handle multiple branches', function() {
      content = 'foobar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          'foobar'
        ]);
      });

      content = 'bazbat';
      clientSide.loadHtml('app', 'baz', function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          'bazbat'
        ]);
      });

      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          'foobar'
        ]);
      });
    });
    it('should handle fs errors', function() {
      fs.readFile.restore();
      this.stub(fs, 'readFile', function(path, callback) {
        callback(new Error('bang'));
      });
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.match(/bang/);
      });
    });
  });
  describe('#inline', function() {
    beforeEach(function() {
      this.stub(clientSide, 'loadHtml', function(app, branch, callback) {
        callback(undefined, ['foo', 'bar']);
      });
    });
    it('should include phoenix config data', function() {
      clientSide.inline('app', 'phoenixConfig', {foo: 'z'}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foo<script type="text/javascript">phoenixConfig = {"foo":"z"};</script>\nbar');
      });
    });
    it('should handle no data', function() {
      clientSide.inline('app', undefined, undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foobar');
      });
    });
    it('should include branch', function() {
      clientSide.inline('app', 'phoenixConfig', {branch: 'foo'}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foo<script type="text/javascript">phoenixConfig = {"branch":"foo"};</script>\nbar');
        expect(clientSide.loadHtml).to.have.been.calledWith('app', 'foo');
      });
    });
    it('should handle missing variable name', function() {
      clientSide.inline('app', undefined, {foo: 'z'}, function(err, data) {
        expect(err).to.match(/Config var not specified/);
      });
    });
    it('should handle load errors', function() {
      clientSide.loadHtml.restore();
      this.stub(clientSide, 'loadHtml', function(app, branch, callback) {
        callback(new Error('bang'));
      });
      clientSide.inline('app', 'phoenixConfig', {foo: 'z'}, function(err, data) {
        expect(err).to.match(/bang/);
      });
    });
  });
});
