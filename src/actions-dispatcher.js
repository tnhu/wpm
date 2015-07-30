Class({
  events: 'mousedown mouseup touchstart touchend touchmove touchcancel keydown keyup click input',           // Events which are captured on document level
  defaultEvent: 'click',                                                                                     // Default event (apply for actions which are not specified event)
  defaultEventAlternative: 'touchstart',                                                                     // Alternative default event (mostly applied on mobile devices)

  parsedActionsCache: {},                                                                                    // Action is parsed once, then saved into this cache (key is hash of action attribute value)

  config: wpm.config('actions-dispatcher'),                                                                  // actions dispatcher configuration
  router: wpm.service('router'),                                                                             // router service

  /**
   * Constructor.
   */
  constructor: function ActionsDispatcher() {
    this.defaultEvent = this.config.defaultEvent || this.defaultEvent;                                       // Default Event is configurable via route-action's defaultEvent
    this.defaultEventAlternative = this.config.defaultEventAlternative || this.defaultEventAlternative;      // Alternative Event is also configurable via route-action's defaultEventAlternative
    this.events = this.events.replace(this.defaultEvent, '').replace(this.defaultEventAlternative, '');      // events = events - [defaultEvent, defaultEventAlternative]
  },

  /**
   * Get attribute value from an event. This method queries to get the closest attribute value from
   * event.target.
   * @param   {String}   attributeName Attribute name.
   * @param   {Object}   event         Native event object.
   * @returns {String}   Attribute value for attributeName.
   */
  attributeValueFromEvent: function(attributeName, event) {
    var target = event.target;
    var attributeValue;

    attributeValue = target.getAttribute(attributeName);
    while (!attributeValue && target) {
      target = target.parentNode;
      attributeValue = target && target.getAttribute && target.getAttribute(attributeName);
    }
    return attributeValue;
  },

  initBindingsFromTarget: function(target, eventType) {
    var inputNodeNames = ['input', 'select', 'textarea'];
    var inputEvents = ['input', 'change', 'keypress'];
    var nodeName = target.nodeName.toLowerCase();
    var bindingSelector = target.getAttribute('binding');
    var shouldTriggerBinding, parentNodes, t, value;

    if (bindingSelector) {
      if (inputNodeNames.indexOf(nodeName) !== -1 && inputEvents.indexOf(eventType) !== -1) {
        shouldTriggerBinding = true;
      }
      else if (nodeName === 'input') {
        if (target.type === 'checkbox' || target.type === 'radio') {
          shouldTriggerBinding = true;
        }
      }

      if (shouldTriggerBinding) {
        parentNodes = [];
        t = target;
        while (t) {
          t = t.parentNode;
           if (t) {
             parentNodes.push(t);
           }
        }

        value = target.type === 'checkbox' ? target.checked : target.value;

        this.router.syncBindingFromTarget(bindingSelector, target, value, parentNodes);
      }
    }
  },

  broadcastEvent: function(event, eventType) {
    // Broadcast event to custom event handlers (i.e dropdown, modal handlers)
    wpm.registry.globalEventHandlers.forEach(function(handler) {
      if (handler.globalEventHandler) {
        handler.globalEventHandler(event, eventType);
      }
    });
  },

  /**
   * Initialize action from event.
   * @param {Object} event     Event object.
   * @param {String} eventType Optional translated event type. If not specified, event.type will be used.
   */
  initActionFromEvent: function(event, eventType) {
    var target = event.target;
    var actionAttributeValue;

    console.log('wpm: Init action from event:', event, '- event type:', eventType);

    eventType = eventType || event.type;                                                                     // If eventType is passed, use it intead of event.type
    actionAttributeValue = this.attributeValueFromEvent('action', event);                                    // Get attribute value

    this.initBindingsFromTarget(target, eventType, event);                                                   // Update binding for target, if specified

    if (!actionAttributeValue) {
      this.broadcastEvent(event, eventType);
      return this.initRouteFromEvent(event, eventType);                                                      // If it's not action, pass to initRouteFromEvent
    }

    var actions = this.parsedActionsCache[actionAttributeValue];                                             // Parse action and save in cache
    if (!actions) {
      actions = this.parseActions(actionAttributeValue);
      this.parsedActionsCache[actionAttributeValue] = actions;
    }

    if (actions && actions[eventType]) {                                                                     // If parsing successful and event matched then process
      // console.log('wpm: Action at target', target, 'event:', eventType, 'event:', event);
      this.dispatchAction(actions[eventType], event, target);
    }

    this.broadcastEvent(event, eventType);
  },

  /**
   * Initialize a route from a linkTo link. If it is handled by a route.
   * @param {Event}   event    Native event object.
   * @param {String} eventType Custom event type.
   */
  initRouteFromEvent: function(event, eventType) {
    var href;

    eventType = eventType || event.type;
    if (eventType === this.defaultEvent || eventType === this.defaultEventAlternative) {
      href = this.attributeValueFromEvent('href', event);
      if (href) {
        this.router.routeLinkToURI(href, event);
      }
    }
  },

  /**
   * Dispatch action to router.
   * @param {Object}  action  Action object.
   * @param {Object}  event   Native event object.
   * @param {Element} element Action DOM element.
   */
  dispatchAction: function(action, event, element) {
    // console.log('Dispatch to router action:', action, 'event:', event, 'element:', element);
    this.router.performAction(action, event, element);
  },

  /**
   * Parse action attribute value into action information which has action name,
   * event type and action arguments.
   * @param   {String} actionAttributeValue Action attribute value.
   * @returns {Object} Set of { name: Action name, type: Event type, args: Arguments }
   */
  parseActions: function(actionAttributeValue) {
    var self = this;
    var actions = {};

    if (!actionAttributeValue) {
      return actions;
    }

    var tokens = actionAttributeValue.split('|');
    var len = tokens.length;
    var actionTokens, isEventTypeSpecified, fnSignature, fnTokens, type, actionName, args;

    while (len--) {
      actionTokens = tokens[len].split(':');

      isEventTypeSpecified = actionTokens.length === 2;
      if (isEventTypeSpecified) {
        type = actionTokens[0].trim();
        fnSignature = actionTokens[1];
      }
      else {
        type = self.defaultEvent;
        fnSignature = actionTokens[0];
      }

      fnSignature = fnSignature.replace(')', '');
      fnTokens = fnSignature.split('(');
      actionName = fnTokens[0].trim();

      if (fnTokens.length === 1 || !fnTokens[1]) {    // action="actionName" or action="actionName()"
        args = [];
      }
      else {
        args = fnTokens[1].trim().split(/[\s,]+/);
      }

      actions[type.toLowerCase()] = { name: actionName, args: args };
    }

    return actions;
  },

  /**
   * Document Ready event hanlder.
   */
  documentReady: function () {
    var self = this;
    var actionFlag;

    // Default actions are bound to 'click' or 'touchend', whichever comes first
    document.addEventListener(self.defaultEvent, function(event) {   // Translate touch end event to 'click'
      actionFlag = true;
      return self.initActionFromEvent(event, self.defaultEvent);
    });
    document.addEventListener(self.defaultEventAlternative, function(event) {
      if (!actionFlag) {
        return self.initActionFromEvent(event, self.defaultEvent);
      }
      actionFlag = false;
    });

    // Bind other events (costly events like hover and mousemove are ignored on document level)
    self.events.split(' ').forEach(function(eventName) {
      document.addEventListener(eventName, function(event) {
        return self.initActionFromEvent(event);
      }, false);
    });
  },

  /**
   * Gabage collector.
   */
  gc: function() {
    // TODO Remove items in parsedActionsCache which are no longer used
  },

  /**
   * Main entry point.
   * @param {Class} ActionsDispatcher Action Dispatcher class.
   */
  main: function(ActionsDispatcher) {
    var dispatcher = new ActionsDispatcher();

    if (document.readyState != 'loading') {
      dispatcher.documentReady();
    }
    else {
      document.addEventListener('DOMContentLoaded', dispatcher.documentReady.bind(dispatcher));
    }
    wpm.ActionsDispatcher = dispatcher;
  }
});
