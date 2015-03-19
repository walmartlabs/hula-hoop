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
          {text: 'foo'},
          {embed: 'config'},
          {text: '<script></script><script></script>bar'}
        ]);
      });
    });
    it('should handle no script tags', function() {
      content = 'foobar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          {text: 'foobar'},
          {embed: 'config'}
        ]);
      });
    });

    it('should parse hula-hoop comments', function() {
      content = '<!-- hula-hoop: links -->foo<!-- hula-hoop: scripts --><script></script><script></script>bar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(resourceLoader.index).to.have.been.calledOnce;

        expect(data).to.eql([
          {embed: 'links'},
          {text: 'foo'},
          {embed: 'config'},
          {embed: 'scripts'},
          {text: '<script></script><script></script>bar'}
        ]);
      });
    });
    it('should omit block sections', function() {
      content = '<!-- hula-hoop: links -->foo<!-- hula-hoop: begin scripts --><script></script><script></script><!-- hula-hoop: end scripts -->bar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(resourceLoader.index).to.have.been.calledOnce;

        expect(data).to.eql([
          {embed: 'links'},
          {text: 'foo'},
          {embed: 'config'},
          {embed: 'scripts'},
          {text: 'bar'}
        ]);
      });
    });
    it('should output config only once', function() {
      content = '<!-- hula-hoop: config -->foo<!-- hula-hoop: scripts --><script></script><script></script>bar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(resourceLoader.index).to.have.been.calledOnce;

        expect(data).to.eql([
          {embed: 'config'},
          {text: 'foo'},
          {embed: 'scripts'},
          {text: '<script></script><script></script>bar'}
        ]);
      });
    });
    it('should throw on nested embeds', function() {
      content = 'foo<!-- hula-hoop: begin scripts --><script></script><script></script><!-- hula-hoop: links --><!-- hula-hoop: end scripts -->bar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.match(/Nested embed found: hula-hoop: links/);
      });
    });

    it('should handle multiple branches', function() {
      content = 'foobar';
      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          {text: 'foobar'},
          {embed: 'config'}
        ]);
      });

      content = 'bazbat';
      clientSide.loadHtml('app', 'baz', function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          {text: 'bazbat'},
          {embed: 'config'}
        ]);
      });

      clientSide.loadHtml('app', undefined, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.eql([
          {text: 'foobar'},
          {embed: 'config'}
        ]);
      });
    });

    it('should handle no index file', function() {
      resourceLoader.index.restore();
      this.stub(resourceLoader, 'index', function() {});

      expect(function() {
        clientSide.loadHtml('app', undefined, function(err, data) {});
      }).to.throw(/Unknown index/);
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
    var content;

    beforeEach(function() {
      content = [{text: 'foo'}, {embed: 'config'}, {text: 'bar'}];
      this.stub(clientSide, 'loadHtml', function(app, branch, callback) {
        callback(undefined, content);
      });
    });

    it('should embed scripts and sheets', function() {
      content = [{embed: 'link'}, {text: 'foo'}, {embed: 'config'}, {embed: 'script'}, {text: 'bar'}];
      clientSide.inline('app', 'phoenixConfig', {foo: 'z'}, {js: [{href: 'bar', attr: 'attr2'}], css: [{href: 'baz', attr: 'attr1'}]}, {}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('<link rel="stylesheet" href="baz" attr1>\nfoo<script type="text/javascript">phoenixConfig = {"foo":"z"};</script>\n<script type="text/javascript" src="bar" attr2></script>\nbar');
      });
    });

    it('should include phoenix config data', function() {
      clientSide.inline('app', 'phoenixConfig', {foo: 'z'}, undefined, {}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foo<script type="text/javascript">phoenixConfig = {"foo":"z"};</script>\nbar');
      });
    });
    it('should handle no data', function() {
      clientSide.inline('app', undefined, undefined, undefined, {}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foobar');
      });
    });
    it('should include branch', function() {
      clientSide.inline('app', 'phoenixConfig', {branch: 'foo'}, undefined, {}, function(err, data) {
        expect(err).to.not.exist;

        expect(data).to.equal('foo<script type="text/javascript">phoenixConfig = {"branch":"foo"};</script>\nbar');
        expect(clientSide.loadHtml).to.have.been.calledWith('app', 'foo');
      });
    });
    it('should handle missing variable name', function() {
      expect(function() {
        clientSide.inline('app', undefined, {foo: 'z'}, undefined, {}, function(err, data) {});
      }).to.throw(/Config var not specified/);
    });
    it('should handle load errors', function() {
      clientSide.loadHtml.restore();
      this.stub(clientSide, 'loadHtml', function(app, branch, callback) {
        callback(new Error('bang'));
      });
      clientSide.inline('app', 'phoenixConfig', {foo: 'z'}, undefined, {}, function(err, data) {
        expect(err).to.match(/bang/);
      });
    });
  });
});
