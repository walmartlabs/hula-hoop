var _ = require('underscore'),
    api = require('../api'),
    Hapi = require('hapi');

_.extend(exports, require('./client-side'));
_.extend(exports, require('./resources'));
