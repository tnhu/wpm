Class({
  cookie: wpm.service('cookie'),
  store: wpm.service('store'),

  save: function() {
    var modelName = this.Class.modelName;
    var store = this.store;
    var modelInfo = store.registry[modelName];
    var instances = store.instances[modelName];

    if (!instances || modelInfo.singleton) {
      store.instances[modelName] = [this];
    }
    else {
      var index = instances.indexOf(this);

      if (index === -1) {
        instances.push(this);
      }
      else {
        instances[index] = this;
      }
    }

    store.persist(modelName);
  },

  remove: function() {
    var store = this.store;
    var modelName = this.Class.modelName;
    var instances = store.instances[modelName];
    var index = instances && instances.indexOf(this);

    if (index !== -1) {
      instances.splice(index, 1);
      store.remove(modelName);
    }
  },

  $ready: function(ModelClass, parent, api) {
    if (this !== ModelClass) {
      var store = wpm.service('store').get();

      if (api.modelName) {
        ModelClass.modelName = api.modelName;
        store.registry[api.modelName] = {
          Class: ModelClass,
          singleton: api.singleton
        };

        // delete meta properties (make sure model has its own fresh fields)
        delete ModelClass.prototype.modelName;
        delete ModelClass.prototype.singleton;
      }
      else {
        throw 'wpm: Model class must specify modelName';
      }
    }
  },

  main: function(Model) {
    wpm.Model = Model;
  }
});
