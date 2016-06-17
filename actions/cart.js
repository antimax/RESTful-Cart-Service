'use strict';

exports.endpointVerbSink = {
  name:                   'endpointVerbSink',
  description:            'Cart endpoint non-standard verb handler',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { items: {} },

  run: function(api, data, next) {
    if (data.connection.rawConnection.method == 'OPTIONS') {
      data.connection.response = 'Documentation: /public/docs/cart';
      data.connection.rawConnection.responseHeaders.push(['Allow', 'OPTIONS, POST']);
      next();
    }

    return api.view.renderEmptyResponse(405, data, next);
  }
};

exports.cartCreate = {
  name:                   'cartCreate',
  description:            'Creates a new cart resource',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { items: {} },

  run: function(api, data, next) {
    var cart = api.cart.create(data.params.items);
    try {
      var cart = api.cart.create(data.params.items);
    } catch (e) {
      data.connection.rawConnection.responseHttpCode = 422;
      return next(e);
    }

    return api.view.renderCart(cart, data, next);
  }
};

exports.cartGet = {
  name:                   'cartGet',
  description:            'Gets cart resource',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    return api.action.commonGet(
      id => api.cart.getMetadata(id),
      id => api.cart.get(id),
      (cart, data, next) => api.view.renderCart(cart, data, next),
      api, data, next
    );
  }
};

exports.cartItemGet = {
  name:                   'cartItemGet',
  description:            'Gets cart item resource',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    return api.action.commonGet(
      id => api.cart.getItemMetadata(id),
      id => api.cart.getItem(id),
      (item, data, next) => api.view.renderCartItem(item, data, next),
      api, data, next
    );
  }
};

exports.cartVerbSink = {
  name:                   'cartVerbSink',
  description:            'Cart non-standard verb handler',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    if (data.connection.rawConnection.method == 'HEAD') {
      return api.action.commonGet(
        id => api.cart.getMetadata(id),
        null, null, api, data, next
      );
    }

    return api.view.renderEmptyResponse(405, data, next);
  }
};

exports.cartItemVerbSink = {
  name:                   'cartItemVerbSink',
  description:            'Cart item non-standard verb handler',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    if (data.connection.rawConnection.method == 'HEAD') {
      return api.action.commonGet(
        id => api.cart.getItemMetadata(id),
        null, null, api, data, next
      );
    }

    return api.view.renderEmptyResponse(405, data, next);
  }
};

exports.cartDelete = {
  name:                   'cartDelete',
  description:            'Deletes cart',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    return api.action.commonDelete(
      id => api.cart.getMetadata(id),
      id => api.cart.delete(id),
      api, data, next
    );
  }
};

exports.cartItemDelete = {
  name:                   'cartItemDelete',
  description:            'Deletes cart item',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true } },

  run: function(api, data, next) {
    return api.action.commonDelete(
      id => api.cart.getItemMetadata(id),
      id => api.cart.deleteItem(id),
      api, data, next
    );
  }
};

exports.cartItemPut = {
  name:                   'cartItemPut',
  description:            'Replaces cart item',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true }, item: { required: true } },

  run: function(api, data, next) {
    api.action.updateCartItem((id, item) => api.cart.putItem(id, item), api, data, next);
  }
};

exports.cartItemPatch = {
  name:                   'cartItemPatch',
  description:            'Patches cart item',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true }, item: { required: true } },

  run: function(api, data, next) {
    api.action.updateCartItem((id, item) => api.cart.patchItem(id, item), api, data, next);
  }
};

exports.cartUpdateItems = {
  name:                   'cartUpdateItems',
  description:            'Adds (POST) or replaces (PUT) items in the cart',
  blockedConnectionTypes: [],
  outputExample:          {},
  matchExtensionMimeType: false,
  version:                1.0,
  toDocument:             true,
  middleware:             [],

  inputs: { id: { required: true }, items: { required: true } },

  run: function(api, data, next) {
    let requestEtag = data.connection.rawConnection.req.headers['if-match'];
    let metadata = api.cart.getMetadata(data.params.id);

    if (typeof metadata == 'undefined') {
      return api.view.renderEmptyResponse(404, data, next);
    }

    if (requestEtag && requestEtag == api.view.composeEtag(metadata.updated)) {
      try {
        var updatedCart = api.cart.updateItems(data.params.id, data.params.items, data.connection.rawConnection.method == 'PUT');
      } catch (e) {
        data.connection.rawConnection.responseHttpCode = 422;
        return next(e);
      }

      return api.view.renderCart(updatedCart, data, next);
    }

    return api.view.renderEmptyResponse(412, data, next);
  }
};
