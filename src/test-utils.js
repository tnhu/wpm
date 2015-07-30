// Some utilities helpful for testing purposes
// TODO Use a generator to make this class cleaner

Class({
  constructor: function TestUtils() {
  },

  mousedown: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'mousedown', target: element[0] || element });
  },

  mouseup: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'mouseup', target: element[0] || element });
  },

  touchstart: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'touchstart', target: element[0] || element });
  },

  touchend: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'touchend', target: element[0] || element });
  },

  keydown: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'keydown', target: element[0] || element });
  },

  keyup: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'keyup', target: element[0] || element });
  },

  click: function(element) {
    var noop = function() {};
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'click', target: element[0] || element, stopPropagation: noop, preventDefault: noop });
  },

  input: function(element) {
    wpm.ActionsDispatcher.initActionFromEvent({ type: 'input', target: element[0] || element });
  },

  main: function(TestUtils) {
    wpm.TestUtils = new TestUtils();
  }
});
