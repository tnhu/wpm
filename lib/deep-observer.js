// Code by Cameron Behar (http://bit.ly/1J0YnrQ)
(function(window, document, undefined) {

    window.totalObservers = 0;  // ONLY FOR DEBUGGING.

    var DeepObserver = function(obj) {
        if (typeof obj != 'object' || obj == null) {
            throw new Error('Object.observe cannot observe non-object');
        }

        this.object = obj;
        this.listener = null;
        this.observer = null;
        this.childObservers = {};
    };


    DeepObserver.prototype.observeChild_ = function(key) {
        var child = this.object[key];
        if (typeof child != 'object' || child == null) {
            return;
        }

        var observer = new DeepObserver(child);
        observer.open(this.listener);
        this.childObservers[key] = observer;
    };


    DeepObserver.prototype.unobserveChild_ = function(key) {
        if (!this.childObservers[key]) {
            return; // Old value was a primitive.
        }
        this.childObservers[key].close();
        delete this.childObservers[key];
    };


    DeepObserver.prototype.observerChangeHandler_ = function(added, removed, changed, getOldValueFn) {
        Object.keys(removed).concat(Object.keys(changed)).forEach(function(key) {
            this.unobserveChild_(key);
        }.bind(this));

        Object.keys(added).concat(Object.keys(changed)).forEach(function(key) {
            this.observeChild_(key);
        }.bind(this));

        this.listener(added, removed, changed, getOldValueFn);
    };


    DeepObserver.prototype.open = function(listener) {
        if (this.observer)
          throw Error('ObservedObject in use');

        this.listener = listener;
        this.observer = new ObjectObserver(this.object);
        this.observer.open(this.observerChangeHandler_.bind(this));
        Object.keys(this.object).forEach(function(key) {
            this.observeChild_(key);
        }.bind(this));

        ++window.totalObservers;  // ONLY FOR DEBUGGING.
    };


    DeepObserver.prototype.close = function() {
        this.listener = null;

        this.observer.close();
        this.observer = null;

        Object.keys(this.object).forEach(function(key) {
            this.unobserveChild_(key);
        }.bind(this));
        this.childObservers = {};
        this.object = null;

        --window.totalObservers;  // ONLY FOR DEBUGGING.
    };


    window.DeepObserver = DeepObserver;
})(window, document);
