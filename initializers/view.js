'use strict';

module.exports = {
  loadPriority:  1000,
  startPriority: 1000,
  stopPriority:  1000,
  initialize: function(api, next){
    api.view = {
      cacheControlHeader: ['Cache-Control', 'max-age=10, must-revalidate, public'],

      renderCart: function(cart, data, next) {
        let response = {};

        let items = [];
        let embedded = [];
        let totalQuantity = 0;
        for (let item of cart.items) {
          totalQuantity += item.item.quantity;

          let itemResponse = this._itemResponse(item);

          embedded.push(itemResponse);
          items.push({ href: itemResponse._links.self.href, title: item.item.title });
        }

        response._links = {
          self: { href: '/cart/' + cart.uuid },
          curies: [{ name: "cart", href: "/public/rels/{rel}", "templated": true }],
          'cart:addItems': { href: '/cart/' + cart.uuid },
          'cart:replaceItems': { href: '/cart/' + cart.uuid },
          'cart:delete': { href: '/cart/' + cart.uuid },
          item: items,
        };

        response.itemCount = items.length;
        response.totalQuantity = totalQuantity;
        response._embedded = { 'item': embedded };

        data.response = response;
        data.connection.rawConnection.responseHeaders.push(['Etag', api.view.composeEtag(cart.updated)]);
        data.connection.rawConnection.responseHeaders.push(this.cacheControlHeader);
        return next();
      },

      renderCartItem: function(item, data, next) {
          data.response = this._itemResponse(item);
          data.connection.rawConnection.responseHeaders.push(['Etag', api.view.composeEtag(item.updated)]);
          data.connection.rawConnection.responseHeaders.push(this.cacheControlHeader);
          return next();
      },

      renderEmptyResponse: function(statusCode, data, next) {
        if (statusCode == 200) {
          data.connection.rawConnection.responseHeaders.push(this.cacheControlHeader);
        }

        data.connection.rawConnection.responseHeaders.push(['Content-Type', 'text/plain']);
        data.response = '';
        data.connection.rawConnection.responseHttpCode = statusCode;
        data.toProcess = false;
        next();
      },

      composeEtag: function(etag) {
        return 'W/"' + etag + '"';
      },

      _itemResponse: function(item) {
        let response = this._shallowCopy(item.item);

        response['_links'] = {
          self: { href: '/cart/item/' + item.uuid },
          curies: [{ name: "cart", href: "/public/rels/{rel}", "templated": true }],
          'cart:patchItem': { href: '/cart/item/' + item.uuid },
          'cart:replaceItem': { href: '/cart/item/' + item.uuid },
          'cart:delete': { href: '/cart/item/' + item.uuid }
        };

        return response;
      },

      _shallowCopy: function(object) {
        var result = {};

        for (var key in object) {
          result[key] = object[key];
        }

        return result;
      }
    };

    next();
  }
};
