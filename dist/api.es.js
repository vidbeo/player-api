function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var loglevel = {exports: {}};

/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/

(function (module) {
  (function (root, definition) {

    if (module.exports) {
      module.exports = definition();
    } else {
      root.log = definition();
    }
  })(commonjsGlobal, function () {

    var noop = function () {};

    var undefinedType = "undefined";
    var isIE = typeof window !== undefinedType && typeof window.navigator !== undefinedType && /Trident\/|MSIE /.test(window.navigator.userAgent);
    var logMethods = ["trace", "debug", "info", "warn", "error"]; // Cross-browser bind equivalent that works at least back to IE6

    function bindMethod(obj, methodName) {
      var method = obj[methodName];

      if (typeof method.bind === 'function') {
        return method.bind(obj);
      } else {
        try {
          return Function.prototype.bind.call(method, obj);
        } catch (e) {
          // Missing bind shim or IE8 + Modernizr, fallback to wrapping
          return function () {
            return Function.prototype.apply.apply(method, [obj, arguments]);
          };
        }
      }
    } // Trace() doesn't print the message in IE, so for that case we need to wrap it


    function traceForIE() {
      if (console.log) {
        if (console.log.apply) {
          console.log.apply(console, arguments);
        } else {
          // In old IE, native console methods themselves don't have apply().
          Function.prototype.apply.apply(console.log, [console, arguments]);
        }
      }

      if (console.trace) console.trace();
    } // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces


    function realMethod(methodName) {
      if (methodName === 'debug') {
        methodName = 'log';
      }

      if (typeof console === undefinedType) {
        return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
      } else if (methodName === 'trace' && isIE) {
        return traceForIE;
      } else if (console[methodName] !== undefined) {
        return bindMethod(console, methodName);
      } else if (console.log !== undefined) {
        return bindMethod(console, 'log');
      } else {
        return noop;
      }
    } // These private functions always need `this` to be set properly


    function replaceLoggingMethods(level, loggerName) {
      /*jshint validthis:true */
      for (var i = 0; i < logMethods.length; i++) {
        var methodName = logMethods[i];
        this[methodName] = i < level ? noop : this.methodFactory(methodName, level, loggerName);
      } // Define log.log as an alias for log.debug


      this.log = this.debug;
    } // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods


    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
      return function () {
        if (typeof console !== undefinedType) {
          replaceLoggingMethods.call(this, level, loggerName);
          this[methodName].apply(this, arguments);
        }
      };
    } // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.


    function defaultMethodFactory(methodName, level, loggerName) {
      /*jshint validthis:true */
      return realMethod(methodName) || enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";

      if (typeof name === "string") {
        storageKey += ":" + name;
      } else if (typeof name === "symbol") {
        storageKey = undefined;
      }

      function persistLevelIfPossible(levelNum) {
        var levelName = (logMethods[levelNum] || 'silent').toUpperCase();
        if (typeof window === undefinedType || !storageKey) return; // Use localStorage if available

        try {
          window.localStorage[storageKey] = levelName;
          return;
        } catch (ignore) {} // Use session cookie as fallback


        try {
          window.document.cookie = encodeURIComponent(storageKey) + "=" + levelName + ";";
        } catch (ignore) {}
      }

      function getPersistedLevel() {
        var storedLevel;
        if (typeof window === undefinedType || !storageKey) return;

        try {
          storedLevel = window.localStorage[storageKey];
        } catch (ignore) {} // Fallback to cookies if local storage gives us nothing


        if (typeof storedLevel === undefinedType) {
          try {
            var cookie = window.document.cookie;
            var location = cookie.indexOf(encodeURIComponent(storageKey) + "=");

            if (location !== -1) {
              storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
            }
          } catch (ignore) {}
        } // If the stored level is not valid, treat it as if nothing was stored.


        if (self.levels[storedLevel] === undefined) {
          storedLevel = undefined;
        }

        return storedLevel;
      }
      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */


      self.name = name;
      self.levels = {
        "TRACE": 0,
        "DEBUG": 1,
        "INFO": 2,
        "WARN": 3,
        "ERROR": 4,
        "SILENT": 5
      };
      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
        return currentLevel;
      };

      self.setLevel = function (level, persist) {
        if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
          level = self.levels[level.toUpperCase()];
        }

        if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
          currentLevel = level;

          if (persist !== false) {
            // defaults to true
            persistLevelIfPossible(level);
          }

          replaceLoggingMethods.call(self, level, name);

          if (typeof console === undefinedType && level < self.levels.SILENT) {
            return "No console available for logging";
          }
        } else {
          throw "log.setLevel() called with invalid level: " + level;
        }
      };

      self.setDefaultLevel = function (level) {
        if (!getPersistedLevel()) {
          self.setLevel(level, false);
        }
      };

      self.enableAll = function (persist) {
        self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function (persist) {
        self.setLevel(self.levels.SILENT, persist);
      }; // Initialize with the right level


      var initialLevel = getPersistedLevel();

      if (initialLevel == null) {
        initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }

      self.setLevel(initialLevel, false);
    }
    /*
     *
     * Top-level API
     *
     */


    var defaultLogger = new Logger();
    var _loggersByName = {};

    defaultLogger.getLogger = function getLogger(name) {
      if (typeof name !== "symbol" && typeof name !== "string" || name === "") {
        throw new TypeError("You must supply a name when creating a logger.");
      }

      var logger = _loggersByName[name];

      if (!logger) {
        logger = _loggersByName[name] = new Logger(name, defaultLogger.getLevel(), defaultLogger.methodFactory);
      }

      return logger;
    }; // Grab the current global log variable in case of overwrite


    var _log = typeof window !== undefinedType ? window.log : undefined;

    defaultLogger.noConflict = function () {
      if (typeof window !== undefinedType && window.log === defaultLogger) {
        window.log = _log;
      }

      return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
      return _loggersByName;
    }; // ES6 default export, for compatibility


    defaultLogger['default'] = defaultLogger;
    return defaultLogger;
  });
})(loglevel);

var log = loglevel.exports;

var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"; // a browser has a 'window'

var isServer = typeof process !== "undefined" && process.versions != null && process.versions.node != null || typeof caches["default"] != null; // detect Node or CF

var supportsPostMessage = typeof window !== "undefined" && typeof window.postMessage !== "undefined";
var supportedEvents = ["durationchange", "ended", "error", "fullscreenchange", "hotspotclicked", "loadedmetadata", // can be used to get size
"pause", "play", "playing", "progress", "qualitychange", "playbackratechange", "ready", "seeked", "seeking", "trackchange", "timeupdate", "volumechange"];
var supportedMethods = ["exitFullscreen", "getBuffered", "getColour", "getCurrentTime", "getDuration", "getEmbed", "getEnded", "getFullscreen", "getHeight", "getId", "getLoop", "getMuted", "getPaused", "getPlaybackRate", "getPlayed", "getQualities", "getQuality", "getSeekable", "getSeeking", "getTracks", "getTitle", "getUrl", "getVolume", "getWidth", "off", "on", "pause", "play", "ready", "requestFullscreen", "setColour", "setCurrentTime", "setLoop", "setMuted", "setPlaybackRate", "setQuality", "setVolume"];
var weakmapCallbacks = new WeakMap(); // note: we store event and method callbacks in the same map

/**
 * Is the element used with the Vidbeo.Player(element) already one of our iframes?
 *
 * @param {Element} element
 * @return {Boolean}
 */

function isVidbeoIframe(element) {
  //log.info("isVidbeoIframe");
  if (!element || element == null || !element instanceof Element) {
    return false;
  } // check it is an iframe


  if (element.nodeName !== "IFRAME") {
    return false;
  } // check it has a src


  var src = element.getAttribute("src");

  if (typeof src !== "string" || !src.startsWith("https")) {
    // no src or if there is one, not prefixed with https, so we don't want that
    return false;
  } // does its src use our domain? This can be refined with a regex maybe to check the ID too


  if (!src.startsWith("https://embed.vidbeo.com")) {
    return false;
  } // else looks good
  //log.info("isVidbeoIframe: it is");


  return true;
}
/**
 * Is the origin of a message from our iframe's domain?
 *
 * @param {String} domain
 * @returns {Boolean}
 */


function isVidbeoOrigin(origin) {
  //log.info("isVidbeoOrigin", origin);
  if (!origin || origin == null || origin === "") {
    return false;
  }

  var permittedOrigins = ["https://embed.vidbeo.com"];
  return permittedOrigins.includes(origin);
}
/**
 * Send a message to an iframe (because it is on a different domain, can't interact with it directly)
 *
 * We don't need a type param because we will only ever send a message TO an iframe if calling a method on it. Whereas
 * the player iframe may send a message that's an event (type event) or a response to a method (type event)
 *
 * @param {Player} player
 * @param {String} name The name of a method
 * @param {Object} value
 * @returns
 */


function postMessage(player) {
  var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  //log.info("postMessage", name, value);
  // check the player iframe has a window we can post the message to:
  if (!player.element.contentWindow || !player.element.contentWindow.postMessage) {
    //log.warn("The iframe embed could not be contacted");
    throw new Error("The iframe embed could not be contacted");
  } // every message sent TO an iframe calls a method, so set type as 'method'


  var message = {
    type: "method",
    name: name,
    // name of the method
    value: null // assume not needed for this method

  }; // ... some methods will need a value e.g a value for the new volume
  // note: can't use a !value check as some methods use a boolean false value

  if (value != null) {
    message.value = value;
  }

  player.element.contentWindow.postMessage(message, player.origin);
}
/**
 * Process the data from a message
 *
 * @param {Player} player
 * @param {Object} data This is an object like {type: 'event', name: 'play', value: {}}
 * @returns
 */


function processMessage(player, data) {
  //log.info("processMessage");
  // if the data is a string, it will be JSON, so parse it as we want an object (this
  // should not be the case with modern browsers as they all seem to use objects):
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (error) {
      //log.warn(error);
      return false;
    }
  } // ... now we know we have an object to work with
  // if the message did not return any value, set it as null so don't get any undefined error:


  if (typeof data.value === "undefined") {
    data.value = null;
  }

  var valueToReturn = null; // some methods/events may return a value. For others there is no need
  // these are the callbacks we need to call, if any, in response to receiving this message:

  var callbacks = [];

  if (data.value && _typeof(data.value) === "object" && typeof data.value.error === "string") {
    // the message value contains an error so we need to reject any Promise so it is handled by any catch()/error handler, not
    // by the normal function
    //log.info("processMessage the message says there was an error", data);
    // see if there was a catch/error handler for this method/event:
    var promises = getCallbacks(player, data.type + ":" + data.name); // e.g "method:setVolume"

    promises.forEach(function (promise) {
      //log.info("processMessage reject the promise with this error message", data.value.error);
      var error = new Error(data.value.error); // an error event should send a value like {error: "reason"}

      error.name = "Error"; // could use if want to classify a type of error

      promise.reject(error); // ... and now remove that callback

      removeCallback(player, data.type + ":" + data.name, promise);
    });
  } else {
    // a method was successfully called (e.g setVolume), or an event happened which is not an error (e.g timeupdate)
    if (data.type === "method") {
      //log.info("processMessage this message was in response to a method", data);
      // unlike an event, which will always have a callback to receive the value, methods may not have a callback. Someone
      // might call e.g player.setVolume(0.5) with no .then/.catch afterwards
      var callback = shiftCallbacks(player, "method:" + data.name); // since we use one array, prefix with [type:]

      if (callback) {
        //log.info("processMessage there was a callback for method:" + data.name);
        callbacks.push(callback);
        valueToReturn = data.value;
      }
    }

    if (data.type === "event") {
      //log.info("processMessage this message was to notify an event", data);
      // an event should have at least one callback
      callbacks = getCallbacks(player, "event:" + data.name);
      valueToReturn = data.value;
    } // call each callback in the array
    //log.info("processMessage call each callback", callbacks);


    callbacks.forEach(function (callback) {
      try {
        if (typeof callback === "function") {
          // it's a function so call it with the value (if any)
          //log.info("Call this callback function. The value to pass to it, if any:", valueToReturn);
          callback.call(player, valueToReturn);
        } else {
          // it's a Promise so resolve with the value (if any)
          //log.info("Resolve this callback Promise. The value to pass to it, if any:", valueToReturn);
          callback.resolve(valueToReturn);
        }
      } catch (e) {//log.error(e);
      }
    });
  }
}
/**
 * Save a callback for a method or event
 *
 * @param {Player} player
 * @param {String} label (combined type and name e.g "event:timeupdate")
 * @param {Function|Promise} callback
 * @returns
 */


function saveCallback(player, label, callback) {
  //log.info("saveCallback", label);
  // get all the callbacks so far for this player
  var callbacks = weakmapCallbacks.get(player.element) || {};

  if (!(label in callbacks)) {
    // it's NOT already in there, so initialise it with an array. Use an array
    // as someone may want multiple callbacks for the same event
    //log.info("saveCallback: initialise the array for:", label);
    callbacks[label] = [];
  } // add it
  //log.info("saveCallback: push on to the array the callback for:", label);


  callbacks[label].push(callback); // ... and update the global map

  weakmapCallbacks.set(player.element, callbacks);
}
/**
 * Get callbacks for a method or event
 *
 * @param {Player} player
 * @param {String} label (combined type and name e.g "event:timeupdate")
 * @returns {Array}
 */


function getCallbacks(player, label) {
  //log.info("getCallbacks", label);
  var callbacks = weakmapCallbacks.get(player.element) || {};

  if (typeof callbacks[label] === "undefined") {
    return [];
  }

  return callbacks[label];
}
/**
 * Remove callback for a method or event
 *
 * @param {Player} player
 * @param {String} label (combined type and name e.g "event:timeupdate")
 * @param {Function} callback
 * @returns {Boolean}
 */


function removeCallback(player, label, callback) {
  //log.info("removeCallback", label);
  var callbacks = weakmapCallbacks.get(player.element) || {};

  if (!callbacks[label] || callbacks[label].length === 0) {
    // none existed to begin with so effectively it is now removed
    return true;
  }

  if (!callback) {
    // no callback was provided, so wipe any that are there for this label as don't want any now
    callbacks[label] = [];
    weakmapCallbacks.set(player.element, callbacks);
    return true;
  } // else there are possibly callback(s) defind for it so
  // locate this particular one:


  var pos = callbacks[label].indexOf(callback);

  if (pos !== -1) {
    // found it
    callbacks[label].splice(pos, 1); // move the rest along
  } // ... and update the callbacks with that one removed:


  weakmapCallbacks.set(player.element, callbacks);

  if (callbacks[label].length !== 0) {
    return false;
  }

  return true;
}
/**
 * Move callbacks between elements
 *
 * @param {Element} from
 * @param {Element} to
 * @returns
 */


function swapCallbacks(from, to) {
  //log.info("swapCallbacks");
  var callbacks = weakmapCallbacks.get(from);
  weakmapCallbacks.set(to, callbacks);
  weakmapCallbacks["delete"](from);
}
/**
 * Return the first callback and remove it so it isn't called again (so it's then used). So like
 * in response to a method being called, we want that callback called, but not called again as it's used
 *
 * @param {Player} player
 * @param {String} label (combined type and name e.g "event:timeupdate")
 * @returns {Function|Boolean}
 */


function shiftCallbacks(player, label) {
  //log.info("shiftCallbacks", label);
  var callbacks = getCallbacks(player, label); // e.g "event:timeupdate"

  if (callbacks.length === 0) {
    // there are none set, so can't
    return false;
  }

  var callback = callbacks.shift();
  removeCallback(player, label, callback); // return the removed one:
  //log.info("shiftCallbacks can use this (now removed) callback", callback);

  return callback;
}
/**
 * If someone has passed an object of options, some params may not be supported like {abc: 123}. So
 * extract only the ones that are and ignore any that aren't
 *
 * @param {Object} options
 * @returns {Object}
 */


function extractValidEmbedParams() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  //log.info("extractValidEmbedParams", options);
  var acceptedOptions = {}; // assume none
  // these are all the supported options {} values which are used either in constructing an iframe (e.g 'width') or passed
  // in the iframe's src URL (e.g 'colour'). And within those query string params are ones that may be checked server-side (e.g 'jwt') *or*
  // used by the player JS (e.g autoplay)

  var supportedEmbedOptions = ["aspectratio", "autoplay", "colour", "controls", "buttons", "dnt", "height", "id", "jwt", "keyboard", "loop", "muted", "playsinline", "preload", "quality", "responsive", "t", "title", "track", "width"];

  for (var _i = 0, _Object$entries = Object.entries(options); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];

    //console.log(`${key}: ${value}`);
    if (supportedEmbedOptions.includes(key)) {
      // all good e.g 'autoplay'
      acceptedOptions[key] = value;
    }
  }

  return acceptedOptions;
}
/**
 * Is a video id valid?
 *
 * @param {String} id
 * @returns {Boolean}
 */


function isIdValid() {
  var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

  //log.info("isIdValid", id);
  // check its length. Currently legacy IDs are 10 characters and new ones are 21
  if (id.length !== 10 && id.length !== 21) {
    return false;
  } // ok, it's length is ok so now check it contains only valid nanoid characters:


  return /^([a-zA-Z0-9_-]+)$/.test(id);
}
/**
 * Build an iframe embed src
 *
 * @param {Object} options This must include at minimum an id {id: ''}
 * @returns {String}
 */


function buildIframeSrc() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  //log.info("buildIframeSrc", options);
  // double-check there is an id:
  //log.info("buildIframeSrc: check for an id");
  if (!options || typeof options.id !== "string" || !isIdValid(options.id)) {
    return "";
  }

  var src = "https://embed.vidbeo.com/" + options.id; // next we need to include params in the query string based on the options. Some
  // options are used for iframe attributes, like width and height. However ones
  // like colour are passed to the iframe in the query string. So there is a consistent
  // way for people that aren't using the JS SDK:
  //log.info("buildIframeSrc: build query string");

  var queryStringParams = []; // assume none

  for (var _i2 = 0, _Object$entries2 = Object.entries(options); _i2 < _Object$entries2.length; _i2++) {
    var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
        key = _Object$entries2$_i[0],
        value = _Object$entries2$_i[1];

    //log.info("buildIframeSrc", key, value);
    // first, exclude any options that should not be in the query string
    if (["aspectratio", "height", "id", "responsive", "width"].includes(key)) {
      //log.info("buildIframeSrc skipping over this as its not relevant to the query string", key);
      continue;
    } // next, if the value is a boolean true or false, we don't want to send those
    // as strings in a URL like "true" so convert them to 1/0:


    if (typeof value === "boolean") {
      if (value) {
        value = 1; // turn it into '1'
      } else {
        value = 0; // turn it into '0'
      }
    } // now add the key=value to the src. We know the key is URI-safe as it is one
    // of our alphanumeric strings but the value may not be:


    queryStringParams.push(key + "=" + encodeURIComponent(value));
  } //log.info("buildIframeSrc queryStringParams", queryStringParams);


  if (queryStringParams.length > 0) {
    src += "?" + queryStringParams.join("&"); // join key=value with &
  } //log.info("buildIframeSrc src", src);


  return src;
}
/**
 * Make a HTML element from a string of HTML
 *
 * @param {String} html
 * @returns {Element}
 */


function htmlElement() {
  var html = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  var element = document.createElement("div");
  element.innerHTML = html;
  return element.firstChild;
}

var functions = {
  isBrowser: isBrowser,
  isServer: isServer,
  supportsPostMessage: supportsPostMessage,
  supportedEvents: supportedEvents,
  supportedMethods: supportedMethods,
  weakmapCallbacks: weakmapCallbacks,
  isVidbeoIframe: isVidbeoIframe,
  isVidbeoOrigin: isVidbeoOrigin,
  postMessage: postMessage,
  processMessage: processMessage,
  saveCallback: saveCallback,
  getCallbacks: getCallbacks,
  removeCallback: removeCallback,
  swapCallbacks: swapCallbacks,
  shiftCallbacks: shiftCallbacks,
  extractValidEmbedParams: extractValidEmbedParams,
  isIdValid: isIdValid,
  buildIframeSrc: buildIframeSrc,
  htmlElement: htmlElement
};

var loggingEnabled = false; // need a logger to avoid calling console.log:

if (!functions.isBrowser || !loggingEnabled) {
  log.setLevel("silent");
} else {
  log.setDefaultLevel("debug");
} // before going any further, check the player API will work. We need at minimum postMessage if it's a browser,
// or to be running on a server e.g NodeJS or a Cloudflare Worker:


if (!functions.isServer && !functions.supportsPostMessage) {
  // ah, it's not going to work
  log.warn("The Player API is not supported");
  throw new Error("The Player API is not supported");
} // variables


var weakmapPlayer = new WeakMap();
var weakmapIsReady = new WeakMap();
/**
 * This contains the Player to export
 */

var Player = /*#__PURE__*/function () {
  /**
   * Constructor. Create a player. This is the Vidbeo.Player(element, options)
   *
   * @param {String|Element}
   * @param {Object} options Use to set params e.g 'id', 'colour'
   * @return {Player}
   */
  function Player(element) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Player);

    log.info("Player constructor", options); // the element param is required

    if (element == null || typeof element === "undefined") {
      // no element passed (e.g if use: var iframe = document.querySelector('iframe') ... but have no iframe on the page at that time)
      log.warn("The first parameter must be a valid id or element");
      throw new Error("The first parameter must be a valid id or element");
    } // the element param can be a string. If so, it should be the id of an element e.g <div id="abcde"></div>


    if (typeof element === "string" && functions.isBrowser) {
      log.info("Param was a string, so look for an element with id of", element);
      element = document.getElementById(element);
    } // ... so now we should have an element, either by being passed it in already as an element OR
    // having just been fetched. Do we?


    if (!element instanceof Element) {
      // not a DOM Element
      log.warn("The first parameter must either be a valid id or element");
      throw new Error("The first parameter must either be a valid id or element");
    } // the only kind of iframe we support is our own, so if it is an iframe, check it is


    if (element.nodeName === "IFRAME") {
      if (!functions.isVidbeoIframe(element)) {
        log.warn("The first parameter is an iframe but not a valid embedded video");
        throw new Error("The first parameter is an iframe but not a valid embedded video");
      }
    } else {
      // the element they want to use is not an iframe. So ... does it contain one?
      var iframe = element.querySelector("iframe");

      if (iframe != null) {
        // yes
        element = iframe;
      } else {
        // no. So that means we will be making the iframe. And so at the very least
        // we need to know which video ID to embed:
        if (options === null || typeof options.id !== "string" || !functions.isIdValid(options.id)) {
          // missing or invalid {id: ""}
          log.warn("The options.id is missing or invalid");
          throw new Error("The options.id is missing or invalid");
        }
      }
    } // do we have this player already? If so, no need to set it up again and stop now


    if (weakmapPlayer.has(element)) {
      log.info("This element is already known to this JS, so return the Player we already have for it");
      return weakmapPlayer.get(element);
    } // looks good


    var thePlayer = this; // keep a reference to 'this' so don't lose it, as what 'this' is of course changes in the function

    this.element = element;
    this.origin = "*";
    this._window = element.ownerDocument.defaultView; // use a Promise which resolves when the player reports it is ready. That way
    // we will wait for this to resolve before doing other things like playing it

    var onReady = new Promise(function (resolve, reject) {
      thePlayer.receivedMessage = function (message) {
        //log.info("A message has been received"); // could be from anywhere
        // the event (which we call message to make it clearer what's going on) has
        // an 'origin' and 'data'. Check where it came from:
        if (!functions.isVidbeoOrigin(message.origin) || thePlayer.element.contentWindow !== message.source) {
          // ignore it
          log.info("Ah, the message was not from our iframe so ignore it");
          return;
        } // now we know the origin (which includes the protocol) of the sender page, keep track of that:


        if (thePlayer.origin === "*") {
          thePlayer.origin = message.origin;
          log.info("The origin is now known:", thePlayer.origin);
        } // if the data is sent a string (old browsers) it will be JSON, so parse it as we want an object:


        if (typeof message.data === "string") {
          log.info("The message data is a string so will parse it", message.data);

          try {
            message.data = JSON.parse(message.data);
          } catch (error) {
            // hmmm could not parse it: that shouldn't happen!
            log.warn(error);
            return;
          }
        } // ... now we have an object to work with
        // so here we need to see if the player is ready before we can do anything else. Can do that in one of two ways:
        // 1. it returns a response to a prior 'ready()' call saying error


        if (message.data.type === "method" && message.data.name === "ready" && typeof message.data.value.error === "string") {
          log.warn("Got an error back from the iframe when asking if it was ready", message.data);
          var error = new Error("Could not setup player");
          error.name = "Error"; // could use if want to classify a type of error

          reject(error);
          return;
        } // 2. it self-reports an error getting ready


        if (message.data.type === "event" && message.data.name === "ready" && typeof message.data.value.error === "string") {
          log.warn("The iframe reported an error with getting ready", message.data);

          var _error = new Error("Could not setup player");

          _error.name = "Error"; // could use if want to classify a type of error

          reject(_error); // so this would report as e.g "Error: Could not setup player"

          return;
        } // or
        // 3. it returns a response to a prior 'ready()' call without an error in its value, so that means it worked


        if (message.data.type === "method" && message.data.name === "ready") {
          log.info("All good, got success back from the iframe when asking if it was ready", message.data);
          resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()

          return;
        } // 4. it self-reports it is ready without an error in its value, so that means it worked


        if (message.data.type === "event" && message.data.name === "ready") {
          log.info("All good, the iframe has reported it is now ready", message.data);
          resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()

          return;
        } // ... else it's not ready-related, so process the message data


        log.info("Process this message received from the embedded player", message.data);
        functions.processMessage(thePlayer, message.data);
      }; // thePlayer.receivedMessage


      log.info("Listening for any messages sent from the embedded player");

      thePlayer._window.addEventListener("message", thePlayer.receivedMessage); // if the Player(element) was NOT an iframe (e.g it was a div) we need to add an iframe
      // to the page to embed the video in that. Which video is based on the options in the second
      // parameter. The advantage of that approach is if params were added to the query string
      // by the user, and one was later changed or added, they would have to update every URL. Whereas
      // done with JS it's much easier to change an object:


      if (thePlayer.element.nodeName !== "IFRAME") {
        log.info("The element passed is NOT already an iframe, so need to make an iframe within that element e.g div"); // BUT before make the iframe, people may pass wrong params like {madeup: 123}. So need
        // to extract only the ones we actually support either in the query string (like colour) or
        // as iframe attributes (like width):

        var validOptions = functions.extractValidEmbedParams(options); // the options MAY have a width AND height, OR have responsive set:

        var sizing = "";

        if (validOptions.width && validOptions.height && !isNaN(validOptions.width) && !isNaN(validOptions.height)) {
          // specified a width and a height, and both are numbers
          sizing = "fixed";
        } else if (typeof validOptions.responsive === "boolean") {
          // set a responsive preference
          if (validOptions.responsive) {
            sizing = "responsive"; // ok, confirmed
          } else {
            sizing = "manual"; // the user will take care of it as they have set responsive: false AND have not provided a width and height
          }
        } else {
          sizing = "responsive"; // default is we handle it and make it responsive
        } // armed with the params we can build an iframe src URL and its attributes. So
        // e.g things like 'colour' go in the URL, and things like 'width' go in the iframe:


        var _iframe = document.createElement("iframe");

        _iframe.setAttribute("src", functions.buildIframeSrc(validOptions)); // this will include e.g ?colour=ff0000
        // how big should the iframe be? We need to set the width and height only if both are present:


        if (sizing === "fixed") {
          _iframe.setAttribute("width", validOptions.width);

          _iframe.setAttribute("height", validOptions.height);
        }

        _iframe.setAttribute("loading", "lazy"); // might as well add this as modern browsers support it and ones that don't ignore it


        _iframe.setAttribute("frameborder", "0");

        _iframe.setAttribute("allowfullscreen", "");

        _iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"); // bonus: if the option of responsive is set as true, we add inline styles to their element. We make
        // this optional as someone may have already done that with their own CSS and so would set { responsive: false }


        if (sizing === "responsive") {
          element.style.position = "relative";
          element.style.paddingBottom = "56.25%"; // assume 16:9

          if (validOptions.aspectratio) {
            // ah they have specified an aspect ratio for the responsive iframe to be so use that instead. Note this
            // makes the iframe that size but if the content is not that aspect ratio, it maintains its aspect ratio within
            // the player so it does not get distorted
            if (validOptions.aspectratio === "1:1") {
              element.style.paddingBottom = "100%";
            } else if (validOptions.aspectratio === "4:3") {
              element.style.paddingBottom = "75%";
            } else if (validOptions.aspectratio === "21:9") {
              element.style.paddingBottom = "42.857%";
            } else if (validOptions.aspectratio === "9:16") {
              element.style.paddingBottom = "156.25%";
            } else {
              element.style.paddingBottom = "56.25%"; // stick to the default
            }
          } // and we need to make sure the iframe is positioned within that div, again with inline styles:


          _iframe.style.position = "absolute";
          _iframe.style.top = 0;
          _iframe.style.left = 0;
          _iframe.style.border = 0;
          _iframe.style.width = "100%";
          _iframe.style.height = "100%";
        }

        element.appendChild(_iframe); // the element becomes the iframe we have just added

        thePlayer.element = _iframe; // keep a reference to the original element e.g a div

        thePlayer._originalElement = element; // but now the/any callbacks need moving to the new element (the iframe just made):

        functions.swapCallbacks(element, _iframe);
        log.info("Record the new iframe element in weakmapPlayer");
        weakmapPlayer.set(thePlayer.element, thePlayer);
      }
    }); // record the Promise and so can then call .ready() before call a method, and if it is ready, let that proceed:

    weakmapIsReady.set(this, onReady);
    weakmapPlayer.set(this.element, this); // ask the iframe if it's ready. Why, when it sends a 'ready' event? Well if there was an iframe already on the page
    // that likely has *already* fired an event of 'ready'. And so we would not be aware of that happening. So
    // would wait forever for it. So doesn't hurt to double-check it is ready by asking, and if so, it will
    // send back a message to say so which we listen for above:

    if (this.element.nodeName === "IFRAME") {
      log.info("Send a message to the iframe to ask if it is ready by sending it a message to ask");
      functions.postMessage(this, "ready", null); // the iframe may not have loaded at this point, so may get nothing back, that's ok
    } // bonus:
    // there is one player feature that likely will fail when controlled externally using this player API: fullscreen.
    // Why? Because the browser complains it needs user interaction to do that. So we control it further down (rather than send
    // a message to the player, like how other methods work). But as a result, the HTML5 video event of fullscreenchange
    // does not fire and so the player does not know it's now in fullscreen. So its UI is wrong. So need to tell it:


    if (document.fullscreenEnabled) {
      // ah, the page supports the fullscreen API so it should work
      log.info("The HTML5 fullscreen API is supported so listen for the fullscreenchange event");

      this.onDocumentFullscreenchange = function () {
        log.info("A fullscreenchange has happened on the document, so tell the player about it so it can update its state/UI");

        if (document.fullscreenElement instanceof Element) {
          // the player is *now* full-screen as a result of the player API making it, so that means need to store
          // a callback for leaving full-screen. This 'fullscreenexit' event is not
          // a standard HTML5 video one so we need the player to emit it separately
          // to let the page know. Why do we need this at all? This is to handle the case where the player
          // API makes the player fullscreen (via a method) BUT the user uses the player controls to exit
          // fullscreen. Without this, that would not work. Since the player controls work on its document (in
          // the iframe). But that's not the one made fullscreen. So hence need a way to put the player back to
          // normal. This only applies to exiting fullscreen:
          functions.saveCallback(thePlayer, "event:fullscreenexit", function () {
            // this returns a Promise
            return this.playerExitFullscreen();
          });
        } else {
          functions.removeCallback(thePlayer, "event:fullscreenexit", function () {
            // this returns a Promise
            return this.playerExitFullscreen();
          });
        }

        thePlayer.ready().then(function () {
          // tell the player a fullscreenchange has happened and whether it's now full-screen true/false, else it won't know.
          // Then it can update its UI to reflect whether it is now fullscreen or not. We only ever
          // post a message TO the player to call a method, so have an extra method of 'updateFullscreen' (to make it
          // clearly separate to the documented ones which are setX) and its value is the true/false boolean
          var isFullscreen = document.fullscreenElement instanceof Element;
          log.info("Send a message to the iframe to tell it the full-screen state has changed as its own HTML5 video event will not fire", isFullscreen);
          functions.postMessage(thePlayer, "updateFullscreen", isFullscreen); // the method is updateFullscreen and value is whether full-screen now
        });
      }; // listen for a fullscreenchange on the document to know it's happened


      document.addEventListener("fullscreenchange", this.onDocumentFullscreenchange);
    }

    return this;
  }
  /**
   * For internal use
   *
   * This function is needed because browsers generally block efforts to control
   * a player's fullscreen externally. So can't simply call the method to have the player
   * do it as the browser will say there was no user gesture (on the player). So
   * this works on the document, which is the same document the player API is on. So
   * as long as it is a modern browser, it should work. Else https://github.com/sindresorhus/screenfull.js/
   *
   * Note: likely won't work on iPhone as think need to use its native controls in order to go fullscreen?
   *
   * @param {Element} element The player element to make fullscreen
   * @returns {Promise}
   */


  _createClass(Player, [{
    key: "playerRequestFullscreen",
    value: function playerRequestFullscreen(element) {
      log.info("Player.playerRequestFullscreen()"); // keep a reference to 'this' so can use it inside the function

      var thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef.ready() // player.ready()
        .then(function () {
          // BUT of course we don't need to send a message to the iframe: we set
          // fullscreen here. So resolve/reject the Promise depending on whether it worked or not, and so
          // the user's method then/catch handler works the same as if we had sent a message to the player
          log.info("Player.playerRequestFullscreen() call element.requestFullscreen"); // note: modern browsers should return a Promise. But in case they don't, still need to handle it. This
          // is apparently the recommended universal way to do that
          // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen

          var promise = element.requestFullscreen();

          if (promise !== undefined) {
            promise.then(function () {
              // success
              resolve(true); // this parameter is what the 'value' of a message would have been
            })["catch"](function (err) {
              // fail
              //console.error(error)
              log.info("Player.playerRequestFullscreen() reject the promise with this error message", err.message);
              var error = new Error(err.message);
              error.name = "Error"; // could use if want to classify a type of error

              reject(error); // this parameter is what a rejected Promise from a message would have been
            });
          } else {
            // no Promise from the browser
            resolve(document.fullscreenElement); // this parameter is what the 'value' of a message would have been
          }
        })["catch"](reject);
      });
    }
    /**
     * For internal use
     *
     * This function is needed because browsers generally block efforts to control
     * a player's fullscreen externally. So can't simply call the method to have the player
     * do it as the browser will say there was no user gesture (on the player). So
     * this works on the document, which is the same document the player API is on. So
     * as long as it is a modern browser, it should work. Else https://github.com/sindresorhus/screenfull.js/
     *
     * @returns {Promise}
     */

  }, {
    key: "playerExitFullscreen",
    value: function playerExitFullscreen() {
      log.info("Player.playerExitFullscren()"); // keep a reference to 'this' so can use it inside the function

      var thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef.ready() // player.ready()
        .then(function () {
          // BUT unlike other methods, we don't need to send a message to the iframe. We set
          // fullscreen here. So instead resolve/reject the Promise depending on whether that worked or not, and that means
          // the user's method then/catch handler works the same as if we had sent a message to the player
          if (!(document.fullscreenElement instanceof Element)) {
            log.info("Player.playerExitFullscren() the player is not fullscreen, so nothing to do");
            resolve(false);
          } // else the element is fullscreen, so need to exit it


          log.info("Player.playerExitFullscren() call document.exitFullscreen()"); // note: modern browsers should return a Promise. But in case they don't, still need to handle it. This
          // is apparently the recommended universal way to do that
          // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen

          var promise = document.exitFullscreen();

          if (promise !== undefined) {
            promise.then(function () {
              // success
              resolve(false); // this parameter is what the 'value' of a message would have been
            })["catch"](function (err) {
              // fail
              //console.error(error)
              log.info("Player.playerExitFullscreen() reject the promise with this error message", err.message);
              var error = new Error(err.message);
              error.name = "Error"; // could use if want to classify a type of error

              reject(error); // this parameter is what a rejected Promise from a message would have been
            });
          } else {
            // no Promise from the browser
            resolve(!document.fullscreenElement); // this parameter is what the 'value' of a message would have been
          }
        })["catch"](reject);
      });
    }
    /**
     * For internal use: this should not be called externally by a client page (though in theory
     * they could, as our get/set functions are just prettier ways of calling this). Hence this
     * is not in the alphabetical order as the methods below
     *
     * Call a method by posting a message to the iframe
     *
     * @param {String} name The name of it e.g 'play'
     * @param {Object} value This may not be present e.g when calling play() no value is needed
     * @returns {Promise}
     */

  }, {
    key: "method",
    value: function method() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      log.info("Player.method()", name, value);

      if (!name || name == "") {
        throw new Error("A method is required");
      } // check it is a supported method:


      if (!functions.supportedMethods.includes(name)) {
        throw new Error("That method is not supported");
      } // a value is only required for a subset of methods, generally setX ones. No
      // point in calling player iframe if there's no value to send it. So see if it is a 'set' one
      // and if so, if there is no value sent. Note 'on' and 'off' are not included here


      if (["setColour", "setCurrentTime", "setLoop", "setMuted", "setPlaybackRate", "setQuality", "setVolume"].includes(name) && value === null) {
        // note: can't check for !value as some values are boolean false!
        throw new Error("That method requires a value");
      } // keep a reference to 'this' so can use it inside the function


      var thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef.ready().then(function () {
          log.info("Player.method() keep a reference to the callback for this method: " + name);
          functions.saveCallback(thisRef, "method:" + name, {
            resolve: resolve,
            reject: reject
          });
          log.info("Player.method() send a message to the iframe to call this method: " + name, value);
          functions.postMessage(thisRef, name, value); // e.g 'setVolume' (we don't need to send the type as we will only ever use 'method')
        })["catch"](reject);
      });
    }
    /**
     * exitFullscreen
     *
     * Note: there is an additional complication with the fullscreen API in that when use
     * an external button/method to try and make the video enter/exit fullscreen, the browser
     * will likely block it. Why? It complains it needs a user gesture (on the video). Hmm. So
     * need a local fullscreen manager which works on the document, and if that's being used, use
     * that to controls the fullscreen
     *
     * @returns {Promise}
     */

  }, {
    key: "exitFullscreen",
    value: function exitFullscreen() {
      log.info("Player.exitFullscreen()");

      if (document.fullscreenEnabled) {
        // ah, the page supports the fullscreen API so it should work
        // this returns a Promise
        return this.playerExitFullscreen();
      }

      return this.method("exitFullscreen");
    }
    /**
     * getBuffered
     *
     * @returns {Promise}
     */

  }, {
    key: "getBuffered",
    value: function getBuffered() {
      log.info("Player.getBuffered)");
      return this.method("getBuffered");
    }
    /**
     * getColour
     *
     * @returns {Promise}
     */

  }, {
    key: "getColour",
    value: function getColour() {
      log.info("Player.getColour()");
      return this.method("getColour");
    }
    /**
     * getCurrentTime
     *
     * @returns {Promise}
     */

  }, {
    key: "getCurrentTime",
    value: function getCurrentTime() {
      log.info("Player.getCurrentTime()");
      return this.method("getCurrentTime");
    }
    /**
     * getDuration
     *
     * @returns {Promise}
     */

  }, {
    key: "getDuration",
    value: function getDuration() {
      log.info("Player.getDuration()");
      return this.method("getDuration");
    }
    /**
     * getEmbed
     *
     * @returns {Promise}
     */

  }, {
    key: "getEmbed",
    value: function getEmbed() {
      log.info("Player.getEmbed()");
      return this.method("getEmbed");
    }
    /**
     * getEnded
     *
     * @returns {Promise}
     */

  }, {
    key: "getEnded",
    value: function getEnded() {
      log.info("Player.getEnded()");
      return this.method("getEnded");
    }
    /**
     * getFullscreen
     *
     * @returns {Promise}
     */

  }, {
    key: "getFullscreen",
    value: function getFullscreen() {
      log.info("Player.getFullscreen()");
      return this.method("getFullscreen");
    }
    /**
     * getHeight
     *
     * @returns {Promise}
     */

  }, {
    key: "getHeight",
    value: function getHeight() {
      log.info("Player.getHeight()");
      return this.method("getHeight");
    }
    /**
     * getId
     *
     * @returns {Promise}
     */

  }, {
    key: "getId",
    value: function getId() {
      log.info("Player.getId()");
      return this.method("getId");
    }
    /**
     * getLoop
     *
     * @returns {Promise}
     */

  }, {
    key: "getLoop",
    value: function getLoop() {
      log.info("Player.getLoop()");
      return this.method("getLoop");
    }
    /**
     * getMuted
     *
     * @returns {Promise}
     */

  }, {
    key: "getMuted",
    value: function getMuted() {
      log.info("Player.getMuted()");
      return this.method("getMuted");
    }
    /**
     * getPaused
     *
     * @returns {Promise}
     */

  }, {
    key: "getPaused",
    value: function getPaused() {
      log.info("Player.getPaused()");
      return this.method("getPaused");
    }
    /**
     * getPlaybackRate
     *
     * @returns {Promise}
     */

  }, {
    key: "getPlaybackRate",
    value: function getPlaybackRate() {
      log.info("Player.getPlaybackRate()");
      return this.method("getPlaybackRate");
    }
    /**
     * getPlayed
     *
     * @returns {Promise}
     */

  }, {
    key: "getPlayed",
    value: function getPlayed() {
      log.info("Player.getPlayed()");
      return this.method("getPlayed");
    }
    /**
     * getQualities
     *
     * @returns {Promise}
     */

  }, {
    key: "getQualities",
    value: function getQualities() {
      log.info("Player.getQualities()");
      return this.method("getQualities");
    }
    /**
     * getQuality
     *
     * @returns {Promise}
     */

  }, {
    key: "getQuality",
    value: function getQuality() {
      log.info("Player.getQuality()");
      return this.method("getQuality");
    }
    /**
     * getSeekable
     *
     * @returns {Promise}
     */

  }, {
    key: "getSeekable",
    value: function getSeekable() {
      log.info("Player.getSeekable()");
      return this.method("getSeekable");
    }
    /**
     * getSeeking
     *
     * @returns {Promise}
     */

  }, {
    key: "getSeeking",
    value: function getSeeking() {
      log.info("Player.getSeeking()");
      return this.method("getSeeking");
    }
    /**
     * getTracks
     *
     * @returns {Promise}
     */

  }, {
    key: "getTracks",
    value: function getTracks() {
      log.info("Player.getTracks()");
      return this.method("getTracks");
    }
    /**
     * getTitle
     *
     * @returns {Promise}
     */

  }, {
    key: "getTitle",
    value: function getTitle() {
      log.info("Player.getTitle()");
      return this.method("getTitle");
    }
    /**
     * getUrl
     *
     * @returns {Promise}
     */

  }, {
    key: "getUrl",
    value: function getUrl() {
      log.info("Player.getUrl()");
      return this.method("getUrl");
    }
    /**
     * getVolume
     *
     * @returns {Promise}
     */

  }, {
    key: "getVolume",
    value: function getVolume() {
      log.info("Player.getVolume()");
      return this.method("getVolume");
    }
    /**
     * getWidth
     *
     * @returns {Promise}
     */

  }, {
    key: "getWidth",
    value: function getWidth() {
      log.info("Player.getWidth()");
      return this.method("getWidth");
    }
    /**
     * The client page can listen for events and when they occur, call a callback function
     *
     * This 'off' removes any callback/Promise if someone no longer needs to know about an event
     *
     * This does *not* return a Promise
     *
     * @param {String} event e.g 'timeupdate'
     * @param {Function} callback
     * @returns
     */

  }, {
    key: "off",
    value: function off() {
      var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      log.info("Player.off()", event);

      if (!event || event == "") {
        throw new Error("An event is required");
      }

      if (!functions.supportedEvents.includes(event)) {
        throw new Error("That event is currently not supported");
      } // if a callback if provided (it does not have to be) it must be a function


      if (callback && typeof callback !== "function") {
        throw new Error("A callback must be a function");
      } // important: each callback needs a prefix because some methods share the same
      // name as events. For example there is a method called 'play' and there is
      // also an event of 'play' (a HTML5 video event) which is not initiated
      // by a method. So need to distinguish which triggered the callback. In this case, 'on' is specific
      // to listening for an event so prefix with 'event:' e.g 'event:play':


      var lastCallback = functions.removeCallback(this, "event:" + event, callback);

      if (lastCallback) {
        // there was one
        log.info("Player.off() tell the player iframe to no longer report this event", event);
        this.method("off", event)["catch"](function () {});
      }
    }
    /**
     * The client page can listen for events and when they occur, call a callback function
     *
     * So 'on' is different as one method handles all events. Can think of the label 'event:X' as being like 'on:X' as the method
     * is on BUT since it covers all events, we instead use the 'event:' prefix
     *
     * This does *not* return a Promise
     *
     * @param {String} event e.g 'timeupdate'
     * @param {Function} callback
     * @returns
     */

  }, {
    key: "on",
    value: function on() {
      var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      log.info("Player.on()", event);

      if (!event || event == "") {
        throw new Error("An event is required");
      }

      if (!functions.supportedEvents.includes(event)) {
        throw new Error("That event is currently not supported");
      }

      if (!callback || callback == null || typeof callback !== "function") {
        throw new Error("A callback is required and it must be a function");
      } // important: each callback needs a prefix because some methods share the same
      // name as events. For example there is a method called 'play' and there is
      // also an event of 'play' (a HTML5 video event) which is not initiated
      // by a method. So need to distinguish which triggered the callback. In this case, 'on' is specific
      // to listening for an event so prefix with 'event:' e.g 'event:play':


      var callbacks = functions.getCallbacks(this, "event:" + event);

      if (callbacks.length === 0) {
        // this is the first time the parent page has been interested in this
        // event so need to tell the player in the iframe to listen for this event e.g "timupdate"
        // (for any subsequent callbacks for the same event *don't* need to, hence length === 0, as one event listener
        // is enough). The second param, the value, is the name of the event interested in
        log.info("Player.on() tell the embedded player the page is interested in being notified about this event", event);
        this.method("on", event)["catch"](function () {});
      }

      log.info("Player.on() record the callback function for", event);
      functions.saveCallback(this, "event:" + event, callback);
    }
    /**
     * pause
     *
     * @returns {Promise}
     */

  }, {
    key: "pause",
    value: function pause() {
      log.info("Player.pause()");
      return this.method("pause");
    }
    /**
     * play
     *
     * @returns {Promise}
     */

  }, {
    key: "play",
    value: function play() {
      log.info("Player.play()");
      return this.method("play");
    }
    /**
     * Ask if the player is ready. This can then be used like player.ready().method()
     *
     * This works a bit differently to other methods in that we don't directly post a message
     * to the player iframe here to ask it
     *
     * @returns {Promise}
     */

  }, {
    key: "ready",
    value: function ready() {
      log.info("Player.ready()"); // if a promise has already been created, get it. Else reject as the player can't have
      // been set up (like if someone does player.ready() without first calling Vidbeo.Player(...))

      var promise = weakmapIsReady.get(this) || new Promise(function (resolve, reject) {
        log.info("Player.ready(): the player has not reported itself as being ready"); // not an error

        reject(new Error("Player is not configured"));
      }); // return a Promise

      return Promise.resolve(promise);
    }
    /**
     * requestFullscreen
     *
     * Note: there is an additional complication with the fullscreen API in that when use
     * an external button/method to try and make the video enter/exit fullscreen, the browser
     * will likely block it. Why? It complains it needs a user gesture (on the video). Hmm. So
     * need a local fullscreen manager which works on the document, and if that's being used, use
     * that to controls the fullscreen
     *
     * Note: a subtle difference between making the player fullscreen externally (using the player API)
     * rather than using its own fullscreen button is that the controls are positioned relative
     * to the player div doing it this way, and so at the bottom of the video. Whereas using the player
     * fullscreen button, the control bar is at the bottom of the *window*. That is the same in other players.
     * Presumably because the controls are relative to the div, and cross domain can not access that, only
     * the element. And that's an iframe
     *
     * @returns {Promise}
     */

  }, {
    key: "requestFullscreen",
    value: function requestFullscreen() {
      log.info("Player.requestFullscreen()");

      if (document.fullscreenEnabled) {
        // ah, the page supports the fullscreen API so it should work
        // this returns a Promise
        return this.playerRequestFullscreen(this.element);
      }

      return this.method("requestFullscreen");
    }
    /**
     * setColour
     *
     * @param {String} value A hex e.g "6c5ce7"
     * @returns {Promise}
     */

  }, {
    key: "setColour",
    value: function setColour(value) {
      log.info("Player.setColour()", value);
      return this.method("setColour", value);
    }
    /**
     * setCurrentTime
     *
     * @param {Number} value In seconds e.g 5
     * @returns {Promise}
     */

  }, {
    key: "setCurrentTime",
    value: function setCurrentTime(value) {
      log.info("Player.setCurrentTime()", value);
      return this.method("setCurrentTime", value);
    }
    /**
     * setLoop
     *
     * @param {Boolean} value
     * @returns {Promise}
     */

  }, {
    key: "setLoop",
    value: function setLoop(value) {
      log.info("Player.setLoop()", value);
      return this.method("setLoop", value);
    }
    /**
     * setMuted
     *
     * @param {Boolean} value
     * @returns {Promise}
     */

  }, {
    key: "setMuted",
    value: function setMuted(value) {
      log.info("Player.setMuted()", value);
      return this.method("setMuted", value);
    }
    /**
     * setPlaybackRate
     *
     * @param {Number} value Between 0.5 and 2 e.g 1.5 (for 1.5x)
     * @returns {Promise}
     */

  }, {
    key: "setPlaybackRate",
    value: function setPlaybackRate(value) {
      log.info("Player.setPlaybackRate()", value);
      return this.method("setPlaybackRate", value);
    }
    /**
     * setQuality
     *
     * @param {String} value e.g '360p'
     * @returns {Promise}
     */

  }, {
    key: "setQuality",
    value: function setQuality(value) {
      log.info("Player.setQuality()", value);
      return this.method("setQuality", value);
    }
    /**
     * setVolume
     *
     * @param {Number} value Between 0 and 1 e.g 0.5 for 50% volume
     * @returns {Promise}
     */

  }, {
    key: "setVolume",
    value: function setVolume(value) {
      log.info("Player.setVolume()", value);
      return this.method("setVolume", value);
    }
  }]);

  return Player;
}();

export { Player as default };
