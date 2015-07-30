/*global localStorage, jsface*/

Class({
  $static: {
    registry: {},
    instances: {},
    isLocalStorageSupported: (function() {
      try {
        var key = Date.now();
        localStorage[key] = key;
        delete localStorage[key];
        return true;
      }
      catch(e) {
        return false;
      }
    })()
  },

  $const: {
    STORE_PREFIX: 'store:',

    create: function(modelName, data) {
      var modelInfo = this.registry[modelName];

      if (modelInfo) {
        var instance = new modelInfo.Class();
        instance.Class = modelInfo.Class;

        if (data) {
          jsface.extend(instance, data);
        }
        return instance;
      }
      else {
        throw 'store: Model with modelName: ' + modelName + ' not found';
      }
    },

    find: function(modelName, filterFn) {
      var key = this.STORE_PREFIX + modelName;

      if (!this.instances[modelName]) {
        var cookie = wpm.service('cookie').get();
        var value;

        value = this.isLocalStorageSupported ? localStorage[key] : cookie(key);
        this.instances[modelName] = value ? JSON.parse(value): [];
      }

      var result = this.instances[modelName];
      var instance;

      if (result) {
        if (result.length > 1) {
          filterFn = filterFn || function() { return true; };

          return result.filter(result, filterFn).map((r, index) => {
            if (r && typeof(r.save) !== 'function') {
              result[index] = r = this.create(modelName, r);
            }

            return r;
          });
        }
        else {
          instance = result[0];

          if (instance && typeof(instance.save) !== 'function') {
            result[0] = instance = this.create(modelName, instance);
          }
          return instance;
        }
      }
    },

    persist: function(modelName) {
      var value = JSON.stringify(this.instances[modelName]);
      var cookie = wpm.service('cookie').get();
      var key = this.STORE_PREFIX + modelName;

      if (this.isLocalStorageSupported) {
        localStorage[key] = value;
      }
      else {
        cookie(key, value);
      }
    },

    remove: function(modelName) {
      var cookie = wpm.service('cookie').get();
      var types = modelName ? [modelName] : Object.keys(this.registry);
      var len = types.length;
      this.instances = {};

      while (len--) {
        modelName = types[len];

        if (this.isLocalStorageSupported) {
          delete localStorage[this.STORE_PREFIX + modelName];
        }
        else {
          cookie(this.STORE_PREFIX + modelName, null);
        }
      }
    },

    removeAll: function() {
      this.remove();
    }
  },

  main: function(Store) {
    wpm.registerService('store', Store);
  }
});
