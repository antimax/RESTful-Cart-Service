'use strict';

module.exports = {
  loadPriority:  1000,
  startPriority: 1000,
  stopPriority:  1000,
  initialize: function(api, next) {
    api.cart = {
      api: api,

      create: function(items) {
        return this.api.storage.cartCreate(this._validateAndNormalizeItems(items));
      },

      get: function(id) {
        return this.api.storage.cartGet(id);
      },

      delete: function(id) {
        return this.api.storage.cartDelete(id);
      },

      updateItems: function(id, items, toReplace) {
        let normalizedItems = this._validateAndNormalizeItems(items);
        return toReplace ?
          this.api.storage.replaceItems(id, normalizedItems) :
          this.api.storage.addItems(id, normalizedItems);
      },

      getMetadata: function(id) {
        return this.api.storage.cartGetMetadata(id);
      },

      getItem: function(id) {
        return this.api.storage.cartItemGet(id);
      },

      deleteItem: function(id) {
        return this.api.storage.cartItemDelete(id);
      },

      putItem: function(id, item) {
        return this.api.storage.cartItemPut(id, this._validateAndNormalizeItems([item])[0]);
      },

      patchItem: function(id, patch) {
        let currentItem = this.api.storage.cartItemGet(id).item;
        let patchedItem = this._applyItemPatch(currentItem, patch);

        return this.api.storage.cartItemPut(id, this._validateAndNormalizeItems([patchedItem])[0]);
      },

      getItemMetadata: function(id) {
        return this.api.storage.cartItemGetMetadata(id);
      },

      _applyItemPatch: function(current, patch) {
        if ('title' in patch) {
          current.title = patch.title;
        }

        if ('quantity' in patch) {
          current.quantity = patch.quantity;
        }

        return current;
      },

      _validateAndNormalizeItems: function(items) {
        // normalized item contains just expected fields esentially droping off unexepected input
        let normalizedItems = [];
        let errors = [];
        if (Array.isArray(items)) {
          // validation and normalization
          items.forEach((item, index) => {
            if (!item.title || item.title.length < 1) {
              errors.push({ index: index, message: "'title' must be a non-empty string" });
            }
            if (!item.quantity || parseInt(item.quantity) < 1) {
              errors.push({ index: index, message: "'quantity' must be a positive integer" });
            }

            normalizedItems.push({ title: item.title, quantity: item.quantity });
          });

          if (errors.length > 0) {
            throw errors;
          }
        }

        return normalizedItems;
      }
    };

    next();
  },
};
