(function (global, fn) {
  "use strict";

  if (typeof define === "function" && define.amd) {
    // AMD: see https://requirejs.org/docs/whyamd.html
    define(fn);
  } else if (typeof module === "object" && module.exports) {
    // webpack? Export the Player as a module
    module.exports = fn();
  } else {
    if (typeof globalThis !== "undefined") {
      // there is a globalThis: see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis
      global = globalThis;
    } else {
      global = global || self;
    }

    // rather than simply call in Player (which may interfere with other players they may have on the same page) prefix with Vidbeo:
    global.Vidbeo = global.Vidbeo || {};
    global.Vidbeo.Player = fn();
    // so now we should have Vidbeo.Player(...). In a browser the global will be the window, so can call Vidbeo.Player(...)
  }
})(this, function () {
  "use strict";

  // need a logger to avoid calling console.log which is slow and may not even be available:
  /*!
   * js-logger - http://github.com/jonnyreeves/js-logger
   * Jonny Reeves, http://jonnyreeves.co.uk/
   * js-logger may be freely distributed under the MIT license.
   */
  (function (global) {
    "use strict";

    // Top level module for the global, static logger instance.
    var Logger = {};

    // For those that are at home that are keeping score.
    Logger.VERSION = "1.6.1";

    // Function which handles all incoming log messages.
    var logHandler;

    // Map of ContextualLogger instances by name; used by Logger.get() to return the same named instance.
    var contextualLoggersByNameMap = {};

    // Polyfill for ES5's Function.bind.
    var bind = function (scope, func) {
      return function () {
        return func.apply(scope, arguments);
      };
    };

    // Super exciting object merger-matron 9000 adding another 100 bytes to your download.
    var merge = function () {
      var args = arguments,
        target = args[0],
        key,
        i;
      for (i = 1; i < args.length; i++) {
        for (key in args[i]) {
          if (!(key in target) && args[i].hasOwnProperty(key)) {
            target[key] = args[i][key];
          }
        }
      }
      return target;
    };

    // Helper to define a logging level object; helps with optimisation.
    var defineLogLevel = function (value, name) {
      return { value: value, name: name };
    };

    // Predefined logging levels.
    Logger.TRACE = defineLogLevel(1, "TRACE");
    Logger.DEBUG = defineLogLevel(2, "DEBUG");
    Logger.INFO = defineLogLevel(3, "INFO");
    Logger.TIME = defineLogLevel(4, "TIME");
    Logger.WARN = defineLogLevel(5, "WARN");
    Logger.ERROR = defineLogLevel(8, "ERROR");
    Logger.OFF = defineLogLevel(99, "OFF");

    // Inner class which performs the bulk of the work; ContextualLogger instances can be configured independently
    // of each other.
    var ContextualLogger = function (defaultContext) {
      this.context = defaultContext;
      this.setLevel(defaultContext.filterLevel);
      this.log = this.info; // Convenience alias.
    };

    ContextualLogger.prototype = {
      // Changes the current logging level for the logging instance.
      setLevel: function (newLevel) {
        // Ensure the supplied Level object looks valid.
        if (newLevel && "value" in newLevel) {
          this.context.filterLevel = newLevel;
        }
      },

      // Gets the current logging level for the logging instance
      getLevel: function () {
        return this.context.filterLevel;
      },

      // Is the logger configured to output messages at the supplied level?
      enabledFor: function (lvl) {
        var filterLevel = this.context.filterLevel;
        return lvl.value >= filterLevel.value;
      },

      trace: function () {
        this.invoke(Logger.TRACE, arguments);
      },

      debug: function () {
        this.invoke(Logger.DEBUG, arguments);
      },

      info: function () {
        this.invoke(Logger.INFO, arguments);
      },

      warn: function () {
        this.invoke(Logger.WARN, arguments);
      },

      error: function () {
        this.invoke(Logger.ERROR, arguments);
      },

      time: function (label) {
        if (typeof label === "string" && label.length > 0) {
          this.invoke(Logger.TIME, [label, "start"]);
        }
      },

      timeEnd: function (label) {
        if (typeof label === "string" && label.length > 0) {
          this.invoke(Logger.TIME, [label, "end"]);
        }
      },

      // Invokes the logger callback if it's not being filtered.
      invoke: function (level, msgArgs) {
        if (logHandler && this.enabledFor(level)) {
          logHandler(msgArgs, merge({ level: level }, this.context));
        }
      },
    };

    // Protected instance which all calls to the to level `Logger` module will be routed through.
    var globalLogger = new ContextualLogger({ filterLevel: Logger.OFF });

    // Configure the global Logger instance.
    (function () {
      // Shortcut for optimisers.
      var L = Logger;

      L.enabledFor = bind(globalLogger, globalLogger.enabledFor);
      L.trace = bind(globalLogger, globalLogger.trace);
      L.debug = bind(globalLogger, globalLogger.debug);
      L.time = bind(globalLogger, globalLogger.time);
      L.timeEnd = bind(globalLogger, globalLogger.timeEnd);
      L.info = bind(globalLogger, globalLogger.info);
      L.warn = bind(globalLogger, globalLogger.warn);
      L.error = bind(globalLogger, globalLogger.error);

      // Don't forget the convenience alias!
      L.log = L.info;
    })();

    // Set the global logging handler.  The supplied function should expect two arguments, the first being an arguments
    // object with the supplied log messages and the second being a context object which contains a hash of stateful
    // parameters which the logging function can consume.
    Logger.setHandler = function (func) {
      logHandler = func;
    };

    // Sets the global logging filter level which applies to *all* previously registered, and future Logger instances.
    // (note that named loggers (retrieved via `Logger.get`) can be configured independently if required).
    Logger.setLevel = function (level) {
      // Set the globalLogger's level.
      globalLogger.setLevel(level);

      // Apply this level to all registered contextual loggers.
      for (var key in contextualLoggersByNameMap) {
        if (contextualLoggersByNameMap.hasOwnProperty(key)) {
          contextualLoggersByNameMap[key].setLevel(level);
        }
      }
    };

    // Gets the global logging filter level
    Logger.getLevel = function () {
      return globalLogger.getLevel();
    };

    // Retrieve a ContextualLogger instance.  Note that named loggers automatically inherit the global logger's level,
    // default context and log handler.
    Logger.get = function (name) {
      // All logger instances are cached so they can be configured ahead of use.
      return (
        contextualLoggersByNameMap[name] ||
        (contextualLoggersByNameMap[name] = new ContextualLogger(
          merge({ name: name }, globalLogger.context)
        ))
      );
    };

    // CreateDefaultHandler returns a handler function which can be passed to `Logger.setHandler()` which will
    // write to the window's console object (if present); the optional options object can be used to customise the
    // formatter used to format each log message.
    Logger.createDefaultHandler = function (options) {
      options = options || {};

      options.formatter =
        options.formatter ||
        function defaultMessageFormatter(messages, context) {
          // Prepend the logger's name to the log message for easy identification.
          if (context.name) {
            messages.unshift("[" + context.name + "]");
          }
        };

      // Map of timestamps by timer labels used to track `#time` and `#timeEnd()` invocations in environments
      // that don't offer a native console method.
      var timerStartTimeByLabelMap = {};

      // Support for IE8+ (and other, slightly more sane environments)
      var invokeConsoleMethod = function (hdlr, messages) {
        Function.prototype.apply.call(hdlr, console, messages);
      };

      // Check for the presence of a logger.
      if (typeof console === "undefined") {
        return function () {
          /* no console */
        };
      }

      return function (messages, context) {
        // Convert arguments object to Array.
        messages = Array.prototype.slice.call(messages);

        var hdlr = console.log;
        var timerLabel;

        if (context.level === Logger.TIME) {
          timerLabel =
            (context.name ? "[" + context.name + "] " : "") + messages[0];

          if (messages[1] === "start") {
            if (console.time) {
              console.time(timerLabel);
            } else {
              timerStartTimeByLabelMap[timerLabel] = new Date().getTime();
            }
          } else {
            if (console.timeEnd) {
              console.timeEnd(timerLabel);
            } else {
              invokeConsoleMethod(hdlr, [
                timerLabel +
                  ": " +
                  (new Date().getTime() -
                    timerStartTimeByLabelMap[timerLabel]) +
                  "ms",
              ]);
            }
          }
        } else {
          // Delegate through to custom warn/error loggers if present on the console.
          if (context.level === Logger.WARN && console.warn) {
            hdlr = console.warn;
          } else if (context.level === Logger.ERROR && console.error) {
            hdlr = console.error;
          } else if (context.level === Logger.INFO && console.info) {
            hdlr = console.info;
          } else if (context.level === Logger.DEBUG && console.debug) {
            hdlr = console.debug;
          } else if (context.level === Logger.TRACE && console.trace) {
            hdlr = console.trace;
          }

          options.formatter(messages, context);
          invokeConsoleMethod(hdlr, messages);
        }
      };
    };

    // Configure and example a Default implementation which writes to the `window.console` (if present).  The
    // `options` hash can be used to configure the default logLevel and provide a custom message formatter.
    Logger.useDefaults = function (options) {
      Logger.setLevel((options && options.defaultLevel) || Logger.DEBUG);
      Logger.setHandler(Logger.createDefaultHandler(options));
    };

    // Createa an alias to useDefaults to avoid reaking a react-hooks rule.
    Logger.setDefaults = Logger.useDefaults;

    // Export to popular environments boilerplate.
    if (typeof define === "function" && define.amd) {
      define(Logger);
    } else if (typeof module !== "undefined" && module.exports) {
      module.exports = Logger;
    } else {
      if (typeof globalThis !== "undefined") {
        // there is a globalThis: see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis
        global = globalThis;
      } else {
        global = global || self;
      }

      Logger._prevLogger = global.Logger;

      Logger.noConflict = function () {
        global.Logger = Logger._prevLogger;
        return Logger;
      };

      global.Logger = Logger;
    }
  })(this);

  // constants
  const iframeDomain = "embed.vidbeo.com";
  const iframeOrigin = "https://" + iframeDomain;
  const iframePrefix = iframeOrigin;
  const loggingEnabled = true;
  const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined"; // a browser has a 'window'
  const isServer =
    (typeof process !== "undefined" &&
      process.versions != null &&
      process.versions.node != null) ||
    typeof caches.default != null; // detect Node or CF
  const supportsPostMessage =
    typeof window !== "undefined" && typeof window.postMessage !== "undefined";
  const isLocal =
    isBrowser && window.location.href.startsWith("https://example.local");

  // the embed options are all of the supported options {} values which are used either in constructing an iframe (e.g 'width') or passed
  // in the iframe's src URL (e.g 'colour'). And within those query string params are ones that may be checked server-side (e.g 'jwt') or
  // used by the player JS (e.g autoplay)
  const supportedEmbedOptions = [
    "aspectratio",
    "autoplay",
    "colour",
    "controls",
    "buttons",
    "dnt",
    "height",
    "id",
    "jwt",
    "keyboard",
    "loop",
    "muted",
    "playsinline",
    "preload",
    "quality",
    "responsive",
    "t",
    "title",
    "track",
    "width",
  ];
  const supportedEvents = [
    "durationchange",
    "ended",
    "error",
    "fullscreenchange",
    "hotspotclicked",
    "loadedmetadata", // can be used to get size
    "pause",
    "play",
    "playing",
    "progress",
    "qualitychange",
    "playbackratechange",
    "ready",
    "seeked",
    "seeking",
    "trackchange",
    "timeupdate",
    "volumechange",
  ];
  const supportedMethods = [
    "exitFullscreen",
    "getBuffered",
    "getColour",
    "getCurrentTime",
    "getDuration",
    "getEmbed",
    "getEnded",
    "getFullscreen",
    "getHeight",
    "getId",
    "getLoop",
    "getMuted",
    "getPaused",
    "getPlaybackRate",
    "getPlayed",
    "getQualities",
    "getQuality",
    "getSeekable",
    "getSeeking",
    "getTracks",
    "getTitle",
    "getUrl",
    "getVolume",
    "getWidth",
    "off",
    "on",
    "pause",
    "play",
    "ready",
    "requestFullscreen",
    "setColour",
    "setCurrentTime",
    "setLoop",
    "setMuted",
    "setPlaybackRate",
    "setQuality",
    "setVolume",
  ];

  // variables
  var weakmapPlayer = new WeakMap();
  var weakmapIsReady = new WeakMap();
  var weakmapCallbacks = new WeakMap(); // note: we store event and method callbacks in the same map

  // logging
  if (isBrowser && isLocal && loggingEnabled) {
    // default is to only log warnings+ (for production) but when working locally, reduce that so can see all the debug info messages too
    Logger.setLevel(Logger.INFO);
  }
  Logger.setHandler(
    Logger.createDefaultHandler({
      formatter: function (messages, context) {
        // prefix each log message with a timestamp and what this is so can distinguish its messages from ones made by e.g the player
        messages.unshift(new Date().toUTCString() + " Vidbeo.Player");
      },
    })
  );

  // before going any further, check the player API will work. We need at minimum postMessage if it's a browser,
  // or to be running on a server e.g NodeJS or a Cloudflare Worker:
  if (!isServer && !supportsPostMessage) {
    // ah, it's not going to work
    Logger.warn("The Player API is not supported");
    throw new Error("The Player API is not supported");
  }

  /**
   * Is the element used with the Vidbeo.Player(element) already one of our iframes?
   *
   * @param {Element} element
   * @return {Boolean}
   */
  function isVidbeoIframe(element) {
    Logger.info("isVidbeoIframe");

    if (!element || element == null || !element instanceof Element) {
      return false;
    }

    // check it is an iframe
    if (element.nodeName !== "IFRAME") {
      return false;
    }

    // check it has a src
    var src = element.getAttribute("src");
    if (typeof src !== "string" || !src.startsWith("https")) {
      // no src or if there is one, not prefixed with https, so we don't want that
      return false;
    }

    // does its src have our domain in? This can be refined with a regex maybe
    if (!src.startsWith(iframeOrigin) && src.indexOf(iframeDomain) === -1) {
      return false;
    }

    // else looks good
    //Logger.info("isVidbeoIframe: it is");
    return true;
  }

  /**
   * Is the origin of a message from our iframe's domain?
   *
   * @param {String} domain
   * @returns {Boolean}
   */
  function isVidbeoOrigin(origin) {
    Logger.info("isVidbeoOrigin", origin);

    if (!origin || origin == null || origin === "") {
      return false;
    }

    let permittedOrigins = [iframeOrigin, iframeOrigin + ".local"];

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
  function postMessage(player, name = "", value = null) {
    Logger.info("postMessage", name, value);

    // check the player iframe has a window we can post the message to:
    if (
      !player.element.contentWindow ||
      !player.element.contentWindow.postMessage
    ) {
      Logger.warn("The iframe embed could not be contacted");
      throw new Error("The iframe embed could not be contacted");
    }

    // every message sent TO an iframe calls a method, so set type as 'method'
    let message = {
      type: "method",
      name: name, // name of the method
      value: null, // assume not needed for this method
    };
    // ... some methods will need a value e.g a value for the new volume
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
    Logger.info("processMessage");

    // if the data is a string, it will be JSON, so parse it as we want an object (this
    // should not be the case with modern browsers as they all seem to use objects):
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error) {
        Logger.warn(error);
        return false;
      }
    }
    // ... now we know we have an object to work with

    // if the message did not return any value, set it as null so don't get any undefined error:
    if (typeof data.value === "undefined") {
      data.value = null;
    }

    var valueToReturn = null; // some methods/events may return a value. For others there is no need

    // these are the callbacks we need to call, if any, in response to receiving this message:
    var callbacks = [];

    if (
      data.value &&
      typeof data.value === "object" &&
      typeof data.value.error === "string"
    ) {
      // the message value contains an error so we need to reject any Promise so it is handled by any catch()/error handler, not
      // by the normal function
      Logger.info("processMessage the message says there was an error", data);

      // see if there was a catch/error handler for this method/event:
      let promises = getCallbacks(player, data.type + ":" + data.name); // e.g "method:setVolume"
      promises.forEach(function (promise) {
        Logger.info(
          "processMessage reject the promise with this error message",
          data.value.error
        );
        var error = new Error(data.value.error); // an error event should send a value like {error: "reason"}
        error.name = "Error"; // could use if want to classify a type of error
        promise.reject(error);

        // ... and now remove that callback
        removeCallback(player, data.type + ":" + data.name, promise);
      });
    } else {
      // a method was successfully called (e.g setVolume), or an event happened which is not an error (e.g timeupdate)

      if (data.type === "method") {
        Logger.info(
          "processMessage this message was in response to a method",
          data
        );

        // unlike an event, which will always have a callback to receive the value, methods may not have a callback. Someone
        // might call e.g player.setVolume(0.5) with no .then/.catch afterwards
        var callback = shiftCallbacks(player, "method:" + data.name); // since we use one array, prefix with [type:]
        if (callback) {
          Logger.info(
            "processMessage there was a callback for method:" + data.name
          );
          callbacks.push(callback);
          valueToReturn = data.value;
        }
      }

      if (data.type === "event") {
        Logger.info("processMessage this message was to notify an event", data);

        // an event should have at least one callback
        callbacks = getCallbacks(player, "event:" + data.name);
        valueToReturn = data.value;
      }

      // call each callback in the array
      Logger.info("processMessage call each callback", callbacks);
      callbacks.forEach(function (callback) {
        try {
          if (typeof callback === "function") {
            // it's a function so call it with the value (if any)
            Logger.info(
              "Call this callback function. The value to pass to it, if any:",
              valueToReturn
            );
            callback.call(player, valueToReturn);
          } else {
            // it's a Promise so resolve with the value (if any)
            Logger.info(
              "Resolve this callback Promise. The value to pass to it, if any:",
              valueToReturn
            );
            callback.resolve(valueToReturn);
          }
        } catch (e) {
          Logger.error(e);
        }
      });
    }
  }

  /**
   * Store a callback for a method or event
   *
   * @param {Player} player
   * @param {String} label (combined type and name e.g "event:timeupdate")
   * @param {Function|Promise} callback
   * @returns
   */
  function storeCallback(player, label, callback) {
    Logger.info("storeCallback", label);

    // get all the callbacks so far for this player
    let callbacks = weakmapCallbacks.get(player.element) || {};
    if (!(label in callbacks)) {
      // it's NOT already in there, so initialise it with an array. Use an array
      // as someone may want multiple callbacks for the same event
      Logger.info("storeCallback: initialise the array for:", label);
      callbacks[label] = [];
    }

    // add it
    Logger.info("storeCallback: push on to the array the callback for:", label);
    callbacks[label].push(callback);

    // ... and update the global map
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
    Logger.info("getCallbacks", label);

    let callbacks = weakmapCallbacks.get(player.element) || {};

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
    Logger.info("removeCallback", label);

    let callbacks = weakmapCallbacks.get(player.element) || {};

    if (!callbacks[label] || callbacks[label].length === 0) {
      // none existed to begin with so effectively it is now removed
      return true;
    }

    if (!callback) {
      // no callback was provided, so wipe any that are there for this label as don't want any now
      callbacks[label] = [];
      weakmapCallbacks.set(player.element, callbacks);
      return true;
    }

    // else there are possibly callback(s) defind for it so
    // locate this particular one:
    let pos = callbacks[label].indexOf(callback);
    if (pos !== -1) {
      // found it
      callbacks[label].splice(pos, 1); // move the rest along
    }
    // ... and update the callbacks with that one removed:
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
    Logger.info("swapCallbacks");

    let callbacks = weakmapCallbacks.get(from);

    weakmapCallbacks.set(to, callbacks);
    weakmapCallbacks.delete(from);
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
    Logger.info("shiftCallbacks", label);

    let callbacks = getCallbacks(player, label); // e.g "event:timeupdate"

    if (callbacks.length === 0) {
      // there are none set, so can't
      return false;
    }

    let callback = callbacks.shift();
    removeCallback(player, label, callback);

    // return the removed one:
    Logger.info("shiftCallbacks can use this (now removed) callback", callback);
    return callback;
  }

  /**
   * If someone has passed an object of options, some params may not be supported like {abc: 123}. So
   * extract only the ones that are and ignore any that aren't
   *
   * @param {Object} options
   * @returns {Object}
   */
  function extractValidEmbedParams(options = {}) {
    Logger.info("extractValidEmbedParams", options);

    let acceptedOptions = {}; // assume none

    for (const [key, value] of Object.entries(options)) {
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
  function isIdValid(id = "") {
    Logger.info("isIdValid", id);

    // check its length. Currently legacy IDs are 10 characters and new ones are 21
    if (id.length !== 10 && id.length !== 21) {
      return false;
    }

    // ok, it's length is ok so now check it contains only valid nanoid characters:
    return /^([a-zA-Z0-9_-]+)$/.test(id);
  }

  /**
   * Build an iframe embed src
   *
   * @param {Object} options This must include at minimum an id {id: ''}
   * @returns {String}
   */
  function buildIframeSrc(options = {}) {
    Logger.info("buildIframeSrc", options);

    // double-check there is an id:
    Logger.info("buildIframeSrc: check for an id");
    if (typeof options.id !== "string" || !isIdValid(options.id)) {
      return "";
    }

    let src = iframePrefix + "/" + options.id;
    // next we need to include params in the query string based on the options. Some
    // options are used for iframe attributes, like width and height. However ones
    // like colour are passed to the iframe in the query string. So there is a consistent
    // way for people that aren't using the JS SDK:
    Logger.info("buildIframeSrc: build query string");
    let queryStringParams = []; // assume none
    for (let [key, value] of Object.entries(options)) {
      Logger.info("buildIframeSrc", key, value);

      // first, exclude any options that should not be in the query string
      if (
        ["aspectratio", "height", "id", "responsive", "width"].includes(key)
      ) {
        Logger.info(
          "buildIframeSrc skipping over this as its not relevant to the query string",
          key
        );
        continue;
      }

      // next, if the value is a boolean true or false, we don't want to send those
      // as strings in a URL like "true" so convert them to 1/0:
      if (typeof value === "boolean") {
        if (value) {
          value = 1; // turn it into '1'
        } else {
          value = 0; // turn it into '0'
        }
      }

      // now add the key=value to the src. We know the key is URI-safe as it is one
      // of our alphanumeric strings but the value may not be:
      queryStringParams.push(key + "=" + encodeURIComponent(value));
    }

    Logger.info("buildIframeSrc queryStringParams", queryStringParams);

    if (queryStringParams.length > 0) {
      src += "?" + queryStringParams.join("&"); // join key=value with &
    }

    Logger.info("buildIframeSrc src", src);
    return src;
  }

  /**
   * The pseudo-classical approach (not using class)
   *
   * This contains the Player to export. Functions outside of this are used within it but are not accessible to pages that include it
   */
  var Player = (function () {
    /**
     * Constructor. Create a player. This is the Vidbeo.Player(element, options)
     *
     * @param {String|Element}
     * @param {Object} options Use to set params that would otherwise be set in the query string e.g 'colour', 'autoplay'
     * @return {Player}
     */
    function Player(element, options = {}) {
      Logger.info("Player constructor", options);

      if (element == null || typeof element === "undefined") {
        // no element passed (e.g if use: var iframe = document.querySelector('iframe') ... but have no iframe on the page at that time)
        Logger.warn("The first parameter must be a valid id or element");
        throw new Error("The first parameter must be a valid id or element");
      }

      // the element can be a string. If so, it should be the id of an element e.g <div id="abcde"></div>
      if (typeof element === "string" && isBrowser) {
        Logger.info(
          "Param was a string, so look for element with id of",
          element
        );

        element = document.getElementById(element);
      }
      // ... so now we should have an element, either by being passed it in already as an element OR
      // having just been fetched. Do we?
      if (!element instanceof Element) {
        // not a DOM Element
        Logger.warn("The first parameter must either be a valid id or element");
        throw new Error(
          "The first parameter must either be a valid id or element"
        );
      }

      // the only kind of iframe we support is our own, so it it is an iframe, check it is
      if (element.nodeName === "IFRAME") {
        if (!isVidbeoIframe(element)) {
          Logger.warn(
            "The first parameter is an iframe but not a valid embedded video"
          );
          throw new Error(
            "The first parameter is an iframe but not a valid embedded video"
          );
        }
      } else {
        // ok, it's not an iframe, does it contain one?
        let iframe = element.querySelector("iframe");
        if (iframe != null) {
          element = iframe;
        }
      }

      // do we have this one already? If so, no need to set it up again and stop now
      if (weakmapPlayer.has(element)) {
        Logger.info(
          "This element is already known to this JS, so return the Player we already have for it"
        );
        return weakmapPlayer.get(element);
      }

      // looks good
      var thePlayer = this; // keep a reference to 'this' so don't lose it, as what 'this' is of course changes in the function

      this.element = element;
      this.origin = "*";
      this._window = element.ownerDocument.defaultView;

      // use a Promise which resolves when the player reports it is ready. That way
      // we will wait for this to resolve before doing other things like playing it
      var onReady = new Promise(function (resolve, reject) {
        thePlayer.receivedMessage = function (message) {
          //Logger.info("A message has been received"); // could be from anywhere

          // the event (which we call message to make it clearer what's going on) has
          // an 'origin' and 'data'. Check where it came from:
          if (
            !isVidbeoOrigin(message.origin) ||
            thePlayer.element.contentWindow !== message.source
          ) {
            // ignore it
            Logger.info("Ah, the message was not from our iframe so ignore it");
            return;
          }

          // now we know the origin (which includes thee protocol) of the sender page, keep track of that:
          if (thePlayer.origin === "*") {
            thePlayer.origin = message.origin;
            Logger.info("The origin is now known:", thePlayer.origin);
          }

          // if the data is sent a string (old browsers?) it will be JSON, so parse it as we want an object:
          if (typeof message.data === "string") {
            Logger.info(
              "The message data is a string so will parse it",
              message.data
            );
            try {
              message.data = JSON.parse(message.data);
            } catch (error) {
              // hmmm could not parse it: that shouldn't happen!
              Logger.warn(error);
              return;
            }
          }
          // ... now we have an object to work with

          // so here we need to see if the player is ready before we can do anything else. Can do that in one of two ways:

          // 1. it returns a response to a prior 'ready()' call saying error
          if (
            message.data.type === "method" &&
            message.data.name === "ready" &&
            typeof message.data.value.error === "string"
          ) {
            Logger.warn(
              "Got an error back from the iframe when asking if it was ready",
              message.data
            );

            let error = new Error("Could not setup player");
            error.name = "Error"; // could use if want to classify a type of error
            reject(error);
            return;
          }

          // 2. it self-reports an error getting ready
          if (
            message.data.type === "event" &&
            message.data.name === "ready" &&
            typeof message.data.value.error === "string"
          ) {
            Logger.warn(
              "The iframe reported an error with getting ready",
              message.data
            );

            let error = new Error("Could not setup player");
            error.name = "Error"; // could use if want to classify a type of error
            reject(error); // so this would report as e.g "Error: Could not setup player"
            return;
          }

          // or

          // 3. it returns a response to a prior 'ready()' call without an error in its value, so that means it worked
          if (message.data.type === "method" && message.data.name === "ready") {
            Logger.info(
              "All good, got success back from the iframe when asking if it was ready",
              message.data
            );

            resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()
            return;
          }

          // 4. it self-reports it is ready without an error in its value, so that means it worked
          if (message.data.type === "event" && message.data.name === "ready") {
            Logger.info(
              "All good, the iframe has reported it is now ready",
              message.data
            );

            resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()
            return;
          }

          // ... else it's not ready-related, so process the message data
          Logger.info(
            "Process this message received from the embedded player",
            message.data
          );
          processMessage(thePlayer, message.data);
        };
        // thePlayer.receivedMessage

        // listen for messages:
        Logger.info(
          "Listen out for any messages sent from the embedded player"
        );
        thePlayer._window.addEventListener(
          "message",
          thePlayer.receivedMessage
        );

        // if the element was NOT an iframe (like it was a div) we need to add an iframe
        // to the page to embed the video in. That can be done based on the options in the second
        // parameter. The advantage of that approach is if params were added to the query string
        // by the user, and one was changed or added, they would have to update every URL. Whereas
        // done with JS, it's much easier to change the object:
        if (thePlayer.element.nodeName !== "IFRAME") {
          Logger.info(
            "The element passed is NOT already an iframe, so need to make an iframe within it"
          );

          // BUT before we make an iframe, people may pass wrong params like {abc: 123}. So need
          // to extract only the ones we actually support either in the query string (like colour) or
          // as iframe attributes (like width):
          let validOptions = extractValidEmbedParams(options);

          // check whether required ones are present and whether certain conbinations are present too:

          // make sure an id has been provided. If not, we don't know which video to embed in the iframe!
          if (!isIdValid(validOptions.id)) {
            // missing or invalid {id: ""}

            // note: inside a Promise so don't throw an error. Instead reject the Promise:
            Logger.warn("The video id is missing or invalid");
            let error = new Error("The video id is missing or invalid");
            error.name = "Error"; // could use if want to classify a type of error
            reject(error);
            return;
          }

          // we need EITHER a width AND height e.g 640 and 360 OR responsive set as true (which means we don't
          // need a width and height set)
          let sizing = false; // assume unknown/invalid
          if (
            validOptions.width &&
            validOptions.height &&
            !isNaN(validOptions.width) &&
            !isNaN(validOptions.height)
          ) {
            // we have a width and a height, and both are numbers
            sizing = "fixed";
          } else if (typeof validOptions.responsive === "boolean") {
            // we have a responsive preference set e.g true. It can be false too. It just needs to be set
            sizing = "responsive";
          } else {
            // hmm we need one or the other!

            // note: inside a Promise so don't throw an error. Instead reject the Promise:
            Logger.warn(
              "You must provide either a value for width and height, or set responsive as true"
            );
            let error = new Error(
              "You must provide either a value for width and height, or set responsive as true"
            );
            error.name = "Error"; // could use if want to classify a type of error
            reject(error);
            return;
          }

          // armed with the params we can build an iframe src URL and its attributes. So
          // e.g things like 'colour' go in the URL, and things like 'width' go in the iframe:
          let iframe = document.createElement("iframe");
          iframe.setAttribute("src", buildIframeSrc(validOptions)); // this will include e.g ?colour=ff0000
          // how big should the iframe be? We need to set a width and height only if both are present:
          if (sizing === "fixed") {
            iframe.setAttribute("width", validOptions.width);
            iframe.setAttribute("height", validOptions.height);
          }
          iframe.setAttribute("loading", "lazy"); // might as well add this as modern browsers support it and ones that don't ignore it
          iframe.setAttribute("frameborder", "0");
          iframe.setAttribute("allowfullscreen", "");
          iframe.setAttribute(
            "allow",
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
          );

          // bonus: if the option of responsive is set, we add inline styles to the element. We make
          // this optional as someone may have already done that with their own CSS
          if (validOptions.responsive) {
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
            }

            // and we need to make sure the iframe is positioned within that div, again with inline styles:
            iframe.style.position = "absolute";
            iframe.style.top = 0;
            iframe.style.left = 0;
            iframe.style.border = 0;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
          }

          element.appendChild(iframe);

          // the element becomes the iframe we have just added
          thePlayer.element = iframe;
          // keep a reference to the original element e.g a div
          thePlayer._originalElement = element;

          // but now the/any callbacks need moving to the new element (the iframe just made):
          swapCallbacks(element, iframe);

          Logger.info("Record the new iframe element in weakmapPlayer");
          weakmapPlayer.set(thePlayer.element, thePlayer);
        }
      });

      // record the Promise and so can then call .ready() before call a method, and if it is ready, let that proceed:
      weakmapIsReady.set(this, onReady);

      weakmapPlayer.set(this.element, this);

      // ask the iframe if it's ready. Why, when it sends a 'ready' event? Well if there was an iframe already on the page
      // that may well have *already* fired an event of 'ready'. And so we would not be aware of that happening. So
      // would wait forever for it. So doesn't hurt to double-check it is ready by asking, and if so, it will
      // send back a message to say so which we listen for above:
      if (this.element.nodeName === "IFRAME") {
        Logger.info(
          "Send a message to the iframe to ask if it is ready by sending it a message to ask"
        );
        postMessage(this, "ready", null); // the iframe may not have loaded at this point, so may get nothing back, that's ok
      }

      // bonus:
      // there is one player feature that likely will fail when controlled externally using this player API: fullscreen.
      // That is because the browser complains it needs user interaction. So we control it further down (rather than send
      // a message to the player, like how other methods work). But as a result, the HTML5 video event of fullscreenchange
      // does not fire and so the player does not know it's now in fullscreen. So it's UI is wrong. So need to tell it:
      if (document.fullscreenEnabled) {
        // ah, the page supports the fullscreen API so it should work
        Logger.info(
          "The HTML5 fullscreen API is supported so listen for the fullscreenchange event"
        );

        this.onDocumentFullscreenchange = function () {
          Logger.info(
            "A fullscreenchange has happened on the document, so tell the player about it so it can update its state/UI"
          );

          if (document.fullscreenElement instanceof Element) {
            // the player is *now* full-screen as a result of the player API making it, so that means need to store
            // a callback for leaving full-screen. This 'fullscreenexit' event is not
            // a standard HTML5 video one so we need the player to emit it separately
            // to let the page know. Why do we need this at all? This is to handle the case where the player
            // API makes the player fullscreen (via a method) BUT the user uses the player controls to exit
            // fullscreen. Without this, that would not work. Since the player controls work on its document (in
            // the iframe). But that's not the one made fullscreen. So hence need a way to put the player back to
            // normal. This only applies to exiting fullscreen:
            storeCallback(thePlayer, "event:fullscreenexit", function () {
              // this returns a Promise
              return this.playerExitFullscreen();
            });
          } else {
            removeCallback(thePlayer, "event:fullscreenexit", function () {
              // this returns a Promise
              return this.playerExitFullscreen();
            });
          }

          thePlayer.ready().then(function () {
            // tell the player a fullscreenchange has happened and whether it's now full-screen true/false, else it won't know.
            // Then it can update its UI to reflect whether it is now fullscreen or not. We only ever
            // post a message TO the player to call a method, so have an extra method of 'updateFullscreen' (to make it
            // clearly separate to the documented ones which are setX) and its value is the true/false boolean
            let isFullscreen = document.fullscreenElement instanceof Element;
            Logger.info(
              "Send a message to the iframe to tell it the full-screen state has changed as its own HTML5 video event will not fire",
              isFullscreen
            );
            postMessage(thePlayer, "updateFullscreen", isFullscreen); // so the method is updateFullscreen and the value is whether full-screen now
          });
        };

        // listen for a fullscreenchange on the document to know it's happened
        document.addEventListener(
          "fullscreenchange",
          this.onDocumentFullscreenchange
        );
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
    Player.prototype.playerRequestFullscreen = function (element) {
      Logger.info("Player.playerRequestFullscreen()");

      // keep a reference to 'this' so can use it inside the function
      let thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef
          .ready()
          .then(function () {
            // BUT of course we don't need to send a message to the iframe: we set
            // fullscreen here. So resolve/reject the Promise depending on whether it worked or not, and so
            // the user's method then/catch handler works the same as if we had sent a message to the player
            Logger.info(
              "Player.playerRequestFullscreen() call element.requestFullscreen"
            );

            // note: modern browsers should return a Promise. But in case they don't, still need to handle it. This
            // is apparently the recommended universal way to do that
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen
            let promise = element.requestFullscreen();
            if (promise !== undefined) {
              promise
                .then(function () {
                  // success
                  resolve(true); // this parameter is what the 'value' of a message would have been
                })
                .catch(function (err) {
                  // fail
                  //console.error(error)
                  Logger.info(
                    "Player.playerRequestFullscreen() reject the promise with this error message",
                    err.message
                  );
                  let error = new Error(err.message);
                  error.name = "Error"; // could use if want to classify a type of error
                  reject(error); // this parameter is what a rejected Promise from a message would have been
                });
            } else {
              // no Promise from the browser
              resolve(document.fullscreenElement); // this parameter is what the 'value' of a message would have been
            }
          })
          .catch(reject);
      });
    };

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
    Player.prototype.playerExitFullscreen = function () {
      Logger.info("Player.playerExitFullscren()");

      // keep a reference to 'this' so can use it inside the function
      let thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef
          .ready()
          .then(function () {
            // BUT unlike other methods, we don't need to send a message to the iframe. We set
            // fullscreen here. So instead resolve/reject the Promise depending on whether that worked or not, and that means
            // the user's method then/catch handler works the same as if we had sent a message to the player
            if (!(document.fullscreenElement instanceof Element)) {
              Logger.info(
                "Player.playerExitFullscren() the player is not fullscreen, so nothing to do"
              );
              resolve(false);
            }

            // else the element is fullscreen, so need to exit it
            Logger.info(
              "Player.playerExitFullscren() call document.exitFullscreen()"
            );
            // note: modern browsers should return a Promise. But in case they don't, still need to handle it. This
            // is apparently the recommended universal way to do that
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen
            let promise = document.exitFullscreen();
            if (promise !== undefined) {
              promise
                .then(function () {
                  // success
                  resolve(false); // this parameter is what the 'value' of a message would have been
                })
                .catch(function (err) {
                  // fail
                  //console.error(error)
                  Logger.info(
                    "Player.playerExitFullscreen() reject the promise with this error message",
                    err.message
                  );
                  let error = new Error(err.message);
                  error.name = "Error"; // could use if want to classify a type of error
                  reject(error); // this parameter is what a rejected Promise from a message would have been
                });
            } else {
              // no Promise from the browser
              resolve(!document.fullscreenElement); // this parameter is what the 'value' of a message would have been
            }
          })
          .catch(reject);
      });
    };

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
    Player.prototype.method = function (name = "", value = null) {
      Logger.info("Player.method()", name, value);

      if (!name || name == "") {
        throw new Error("A method is required");
      }

      // check it is a supported method:
      if (!supportedMethods.includes(name)) {
        throw new Error("That method is not supported");
      }

      // a value is only required for a subset of methods, generally setX ones. No
      // point in calling player iframe if there's no value to send it. So see if it is a 'set' one
      // and if so, if there is no value sent. Note 'on' and 'off' are not included here
      if (
        [
          "setColour",
          "setCurrentTime",
          "setLoop",
          "setMuted",
          "setPlaybackRate",
          "setQuality",
          "setVolume",
        ].includes(name) &&
        value === null
      ) {
        // note: can't check for !value as some values are boolean false!
        throw new Error("That method requires a value");
      }

      // keep a reference to 'this' so can use it inside the function
      let thisRef = this;
      return new Promise(function (resolve, reject) {
        return thisRef
          .ready()
          .then(function () {
            Logger.info(
              "Player.method() keep a reference to the callback for this method: " +
                name
            );
            storeCallback(thisRef, "method:" + name, {
              resolve: resolve,
              reject: reject,
            });

            Logger.info(
              "Player.method() send a message to the iframe to call this method: " +
                name,
              value
            );
            postMessage(thisRef, name, value); // e.g 'setVolume' (we don't need to send the type as we will only ever use 'method')
          })
          .catch(reject);
      });
    };

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
    Player.prototype.exitFullscreen = function () {
      Logger.info("Player.exitFullscreen()");

      if (document.fullscreenEnabled) {
        // ah, the page supports the fullscreen API so it should work

        // this returns a Promise
        return this.playerExitFullscreen();
      }

      return this.method("exitFullscreen");
    };

    /**
     * getBuffered
     *
     * @returns {Promise}
     */
    Player.prototype.getBuffered = function () {
      Logger.info("Player.getBuffered)");

      return this.method("getBuffered");
    };

    /**
     * getColour
     *
     * @returns {Promise}
     */
    Player.prototype.getColour = function () {
      Logger.info("Player.getColour()");

      return this.method("getColour");
    };

    /**
     * getCurrentTime
     *
     * @returns {Promise}
     */
    Player.prototype.getCurrentTime = function () {
      Logger.info("Player.getCurrentTime()");

      return this.method("getCurrentTime");
    };

    /**
     * getDuration
     *
     * @returns {Promise}
     */
    Player.prototype.getDuration = function () {
      Logger.info("Player.getDuration()");

      return this.method("getDuration");
    };

    /**
     * getEmbed
     *
     * @returns {Promise}
     */
    Player.prototype.getEmbed = function () {
      Logger.info("Player.getEmbed()");

      return this.method("getEmbed");
    };

    /**
     * getEnded
     *
     * @returns {Promise}
     */
    Player.prototype.getEnded = function () {
      Logger.info("Player.getEnded()");

      return this.method("getEnded");
    };

    /**
     * getFullscreen
     *
     * @returns {Promise}
     */
    Player.prototype.getFullscreen = function () {
      Logger.info("Player.getFullscreen()");

      return this.method("getFullscreen");
    };

    /**
     * getHeight
     *
     * @returns {Promise}
     */
    Player.prototype.getHeight = function () {
      Logger.info("Player.getHeight()");

      return this.method("getHeight");
    };

    /**
     * getId
     *
     * @returns {Promise}
     */
    Player.prototype.getId = function () {
      Logger.info("Player.getId()");

      return this.method("getId");
    };

    /**
     * getLoop
     *
     * @returns {Promise}
     */
    Player.prototype.getLoop = function () {
      Logger.info("Player.getLoop()");

      return this.method("getLoop");
    };

    /**
     * getMuted
     *
     * @returns {Promise}
     */
    Player.prototype.getMuted = function () {
      Logger.info("Player.getMuted()");

      return this.method("getMuted");
    };

    /**
     * getPaused
     *
     * @returns {Promise}
     */
    Player.prototype.getPaused = function () {
      Logger.info("Player.getPaused()");

      return this.method("getPaused");
    };

    /**
     * getPlaybackRate
     *
     * @returns {Promise}
     */
    Player.prototype.getPlaybackRate = function () {
      Logger.info("Player.getPlaybackRate()");

      return this.method("getPlaybackRate");
    };

    /**
     * getPlayed
     *
     * @returns {Promise}
     */
    Player.prototype.getPlayed = function () {
      Logger.info("Player.getPlayed()");

      return this.method("getPlayed");
    };

    /**
     * getQualities
     *
     * @returns {Promise}
     */
    Player.prototype.getQualities = function () {
      Logger.info("Player.getQualities()");

      return this.method("getQualities");
    };

    /**
     * getQuality
     *
     * @returns {Promise}
     */
    Player.prototype.getQuality = function () {
      Logger.info("Player.getQuality()");

      return this.method("getQuality");
    };

    /**
     * getSeekable
     *
     * @returns {Promise}
     */
    Player.prototype.getSeekable = function () {
      Logger.info("Player.getSeekable()");

      return this.method("getSeekable");
    };

    /**
     * getSeeking
     *
     * @returns {Promise}
     */
    Player.prototype.getSeeking = function () {
      Logger.info("Player.getSeeking()");

      return this.method("getSeeking");
    };

    /**
     * getTracks
     *
     * @returns {Promise}
     */
    Player.prototype.getTracks = function () {
      Logger.info("Player.getTracks()");

      return this.method("getTracks");
    };

    /**
     * getTitle
     *
     * @returns {Promise}
     */
    Player.prototype.getTitle = function () {
      Logger.info("Player.getTitle()");

      return this.method("getTitle");
    };

    /**
     * getUrl
     *
     * @returns {Promise}
     */
    Player.prototype.getUrl = function () {
      Logger.info("Player.getUrl()");

      return this.method("getUrl");
    };

    /**
     * getVolume
     *
     * @returns {Promise}
     */
    Player.prototype.getVolume = function () {
      Logger.info("Player.getVolume()");

      return this.method("getVolume");
    };

    /**
     * getWidth
     *
     * @returns {Promise}
     */
    Player.prototype.getWidth = function () {
      Logger.info("Player.getWidth()");

      return this.method("getWidth");
    };

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
    Player.prototype.off = function (event = "", callback = null) {
      Logger.info("Player.off()", event);

      if (!event || event == "") {
        throw new Error("An event is required");
      }

      if (!supportedEvents.includes(event)) {
        throw new Error("That event is currently not supported");
      }

      // if a callback if provided (it does not have to be) it must be a function
      if (callback && typeof callback !== "function") {
        throw new Error("A callback must be a function");
      }

      // important: each callback needs a prefix because some methods share the same
      // name as events. For example there is a method called 'play' and there is
      // also an event of 'play' (a HTML5 video event) which is not initiated
      // by a method. So need to distinguish which triggered the callback. In this case, 'on' is specific
      // to listening for an event so prefix with 'event:' e.g 'event:play':
      let lastCallback = removeCallback(this, "event:" + event, callback);
      if (lastCallback) {
        // there was one
        Logger.info(
          "Player.off() tell the player iframe to no longer report this event",
          event
        );
        this.method("off", event).catch(function () {});
      }
    };

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
    Player.prototype.on = function (event = "", callback = null) {
      Logger.info("Player.on()", event);

      if (!event || event == "") {
        throw new Error("An event is required");
      }

      if (!supportedEvents.includes(event)) {
        throw new Error("That event is currently not supported");
      }

      if (!callback || callback == null || typeof callback !== "function") {
        throw new Error("A callback is required and it must be a function");
      }

      // important: each callback needs a prefix because some methods share the same
      // name as events. For example there is a method called 'play' and there is
      // also an event of 'play' (a HTML5 video event) which is not initiated
      // by a method. So need to distinguish which triggered the callback. In this case, 'on' is specific
      // to listening for an event so prefix with 'event:' e.g 'event:play':
      let callbacks = getCallbacks(this, "event:" + event);

      if (callbacks.length === 0) {
        // this is the first time the parent page has been interested in this
        // event so need to tell the player in the iframe to listen for this event e.g "timupdate"
        // (for any subsequent callbacks for the same event *don't* need to, hence length === 0, as one event listener
        // is enough). The second param, the value, is the name of the event interested in
        Logger.info(
          "Player.on() tell the embedded player the page is interested in being notified about this event",
          event
        );
        this.method("on", event).catch(function () {});
      }

      Logger.info("Player.on() record the callback function for", event);
      storeCallback(this, "event:" + event, callback);
    };

    /**
     * pause
     *
     * @returns {Promise}
     */
    Player.prototype.pause = function () {
      Logger.info("Player.pause()");

      return this.method("pause");
    };

    /**
     * play
     *
     * @returns {Promise}
     */
    Player.prototype.play = function () {
      Logger.info("Player.play()");

      return this.method("play");
    };

    /**
     * Ask if the player is ready. This can then be used like player.ready().method()
     *
     * This works a bit differently to other methods in that we don't directly post a message
     * to the player iframe here to ask it
     *
     * @returns {Promise}
     */
    Player.prototype.ready = function () {
      Logger.info("Player.ready()");

      // if a promise has already been created, get it. Else reject as the player can't have
      // been set up (like if someone does player.ready() without first calling Vidbeo.Player(...))
      let promise =
        weakmapIsReady.get(this) ||
        new Promise(function (resolve, reject) {
          Logger.info(
            "Player.ready(): the player has not reported itself as being ready"
          ); // not an error
          reject(new Error("Player is not configured"));
        });

      // return a Promise
      return Promise.resolve(promise);
    };

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
    Player.prototype.requestFullscreen = function () {
      Logger.info("Player.requestFullscreen()");

      if (document.fullscreenEnabled) {
        // ah, the page supports the fullscreen API so it should work

        // this returns a Promise
        return this.playerRequestFullscreen(this.element);
      }

      return this.method("requestFullscreen");
    };

    /**
     * setColour
     *
     * @param {String} value A hex e.g "6c5ce7"
     * @returns {Promise}
     */
    Player.prototype.setColour = function (value) {
      Logger.info("Player.setColour()", value);

      return this.method("setColour", value);
    };

    /**
     * setCurrentTime
     *
     * @param {Number} value In seconds e.g 5
     * @returns {Promise}
     */
    Player.prototype.setCurrentTime = function (value) {
      Logger.info("Player.setCurrentTime()", value);

      return this.method("setCurrentTime", value);
    };

    /**
     * setLoop
     *
     * @param {Boolean} value
     * @returns {Promise}
     */
    Player.prototype.setLoop = function (value) {
      Logger.info("Player.setLoop()", value);

      return this.method("setLoop", value);
    };

    /**
     * setMuted
     *
     * @param {Boolean} value
     * @returns {Promise}
     */
    Player.prototype.setMuted = function (value) {
      Logger.info("Player.setMuted()", value);

      return this.method("setMuted", value);
    };

    /**
     * setPlaybackRate
     *
     * @param {Number} value Between 0.5 and 2 e.g 1.5 (for 1.5x)
     * @returns {Promise}
     */
    Player.prototype.setPlaybackRate = function (value) {
      Logger.info("Player.setPlaybackRate()", value);

      return this.method("setPlaybackRate", value);
    };

    /**
     * setQuality
     *
     * @param {String} value e.g '360p'
     * @returns {Promise}
     */
    Player.prototype.setQuality = function (value) {
      Logger.info("Player.setQuality()", value);

      return this.method("setQuality", value);
    };

    /**
     * setVolume
     *
     * @param {Number} value Between 0 and 1 e.g 0.5 for 50% volume
     * @returns {Promise}
     */
    Player.prototype.setVolume = function (value) {
      Logger.info("Player.setVolume()", value);

      return this.method("setVolume", value);
    };

    return Player;
  })();

  return Player;
});
