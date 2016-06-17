'use strict';

module.exports = {
  loadPriority:  1000,
  startPriority: 1000,
  stopPriority:  1000,
  initialize: function(api, next) {
    var contentTypeEnforcer = {
      contentType: 'application/hal+json',
      name: 'contentTypeEnforcer',
      global: true,
      priority: 900,

      preProcessor: function(data, next) {
        data.connection.rawConnection.responseHeaders.push(['Content-Type', this.contentType]);
        next();
      },

      postProcessor: function(data, next) {
        next();
      }
    };

    api.actions.addMiddleware(contentTypeEnforcer);

    next();
  }
};
