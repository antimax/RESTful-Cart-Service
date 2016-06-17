'use strict';

module.exports = {
  loadPriority:  1000,
  startPriority: 1000,
  stopPriority:  1000,
  initialize: function(api, next) {
    api.action = {
      commonGet: function(metadataProvider, dataProvider, renderer, api, data, next) {
        let requestEtag = data.connection.rawConnection.req.headers['if-none-match'];
        if (requestEtag || renderer == null) {
          let metadata = metadataProvider(data.params.id);
          if (typeof metadata === 'undefined') {
            return api.view.renderEmptyResponse(404, data, next);
          }

          if (requestEtag == api.view.composeEtag(metadata.updated)) {
            return api.view.renderEmptyResponse(304, data, next);
          }

          data.connection.rawConnection.responseHeaders.push(['Etag', api.view.composeEtag(metadata.updated)]);

          if (renderer == null) {
            return api.view.renderEmptyResponse(200, data, next);
          }
        }

        let item = dataProvider(data.params.id);
        if (typeof item === 'undefined') {
          return api.view.renderEmptyResponse(404, data, next);
        }

        return renderer(item, data, next);
      },

      commonDelete: function(metadataProvider, deleter, api, data, next) {
        let requestEtag = data.connection.rawConnection.req.headers['if-match'];
        let metadata = metadataProvider(data.params.id);

        if (typeof metadata == 'undefined') {
          return api.view.renderEmptyResponse(404, data, next);
        }

        if (requestEtag && requestEtag == api.view.composeEtag(metadata.updated)) {
          deleter(data.params.id);
          return api.view.renderEmptyResponse(204, data, next);
        }

        return api.view.renderEmptyResponse(412, data, next);
      },

      updateCartItem: function(cartAction, api, data, next) {
        let requestEtag = data.connection.rawConnection.req.headers['if-match'];
        let metadata = api.cart.getItemMetadata(data.params.id);

        if (typeof metadata == 'undefined') {
          return api.view.renderEmptyResponse(404, data, next);
        }

        if (requestEtag && requestEtag == api.view.composeEtag(metadata.updated)) {
          try {
            var updatedItem = cartAction(data.params.id, data.params.item);
          } catch (e) {
            data.connection.rawConnection.responseHttpCode = 422;
            return next(e);
          }

          return api.view.renderCartItem(updatedItem, data, next);
        }

        return api.view.renderEmptyResponse(412, data, next);
      }
    };

    next();
  }
};
