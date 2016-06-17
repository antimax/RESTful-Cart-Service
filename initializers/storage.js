'use strict';

module.exports = {
  loadPriority:  1000,
  startPriority: 1000,
  stopPriority:  1000,
  initialize: function(api, next){
    api.storage = {
      carts: {},
      itemIndex: {},
      uuid: require('node-uuid'),

      cartCreate: function(items) {
        let now = Date.now();
        let cartId = this.uuid.v4();

        return this.carts[cartId] = {
          uuid: cartId,
          created: now,
          updated: now,
          items: this._createItems(cartId, items, now)
        };
      },

      replaceItems: function(cartId, items) {
        let now = Date.now();
        this.carts[cartId].items = this._createItems(cartId, items, now);
        this.carts[cartId].updated = now;
        return this.carts[cartId];
      },

      addItems: function(cartId, items) {
        let now = Date.now();
        this.carts[cartId].items = this.carts[cartId].items.concat(this._createItems(cartId, items, now));
        this.carts[cartId].updated = now;
        return this.carts[cartId];
      },

      cartGet: function(cartId) {
        return this.carts[cartId];
      },

      cartDelete: function(cartId) {
        delete this.carts[cartId];
      },

      cartGetMetadata: function(cartId) {
        return this.cartGet(cartId);
      },

      cartItemGet: function(itemId) {
        return this.itemIndex[itemId];
      },

      cartItemPut: function(itemId, item) {
        this.itemIndex[itemId].item = item;
        this.itemIndex[itemId].updated = Date.now();
        return this.itemIndex[itemId];
      },

      cartItemDelete: function(itemId) {
        let item = this.itemIndex[itemId];
        let cart = this.carts[item.cartUuid];

        let i;
        for (i = 0; i < cart.items.length; i++) {
          if (cart.items[i].uuid == item.uuid) {
            break;
          }
        }

        if (i < cart.items.length) {
          cart.items.splice(i, 1);
        }

        delete this.itemIndex[itemId];
      },

      cartItemGetMetadata: function(itemId) {
        return this.cartItemGet(itemId);
      },

      _createItems: function(cartId, items, now) {
        let self = this;
        return items.map(item => {
          var id = self.uuid.v4();
          return self.itemIndex[id] = { uuid: id, cartUuid: cartId, created: now, updated: now, item: item };
        } );
      },

      _reset: function() {
        this.carts = {};
        this.itemIndex - {};
      }
    };

    next();
  }
};
