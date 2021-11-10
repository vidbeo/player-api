"use strict";

const loggingEnabled = false;

// need a logger to avoid calling console.log:
import log from "loglevel";

import {
  isBrowser,
  isServer,
  supportsPostMessage,
  supportedEvents,
  supportedMethods,
  isVidbeoIframe,
  isVidbeoOrigin,
  postMessage,
  processMessage,
  saveCallback,
  getCallbacks,
  removeCallback,
  swapCallbacks,
  shiftCallbacks,
  extractValidEmbedParams,
  isIdValid,
  buildIframeSrc,
} from "./functions";

// logging?
if (!isBrowser || !loggingEnabled) {
  log.setLevel("silent");
} else {
  log.setDefaultLevel("debug");
}

// before going any further, check the player API will work. We need at minimum postMessage if it's a browser,
// or to be running on a server e.g NodeJS or a Cloudflare Worker:
if (!isServer && !supportsPostMessage) {
  // ah, it's not going to work
  log.warn("The Player API is not supported");
  throw new Error("The Player API is not supported");
}

// variables
var weakmapPlayer = new WeakMap();
var weakmapIsReady = new WeakMap();

/**
 * This contains the Player to export
 */
class Player {
  /**
   * Constructor. Create a player. This is the Vidbeo.Player(element, options)
   *
   * @param {String|Element}
   * @param {Object} options Use to set params e.g 'id', 'colour'
   * @return {Player}
   */
  constructor (element, options = {}) {
    log.info("Player constructor", options);

    // the element param is required
    if (element == null || typeof element === "undefined") {
      // no element passed (e.g if use: var iframe = document.querySelector('iframe') ... but have no iframe on the page at that time)
      log.warn("The first parameter must be a valid id or element");
      throw new Error("The first parameter must be a valid id or element");
    }

    // the element param can be a string. If so, it should be the id of an element e.g <div id="abcde"></div>
    if (typeof element === "string" && isBrowser) {
      log.info("Param was a string, so look for an element with id of", element);

      element = document.getElementById(element);
    }
    // ... so now we should have an element, either by being passed it in already as an element OR
    // having just been fetched. Do we?
    if (!element instanceof Element) {
      // not a DOM Element
      log.warn("The first parameter must either be a valid id or element");
      throw new Error(
        "The first parameter must either be a valid id or element"
      );
    }

    // the only kind of iframe we support is our own, so if it is an iframe, check it is
    if (element.nodeName === "IFRAME") {
      if (!isVidbeoIframe(element)) {
        log.warn(
          "The first parameter is an iframe but not a valid embedded video"
        );
        throw new Error(
          "The first parameter is an iframe but not a valid embedded video"
        );
      }
    } else {
      // the element they want to use is not an iframe. So ... does it contain one?
      let iframe = element.querySelector("iframe");
      if (iframe != null) {
        // yes
        element = iframe;
      } else {
        // no. So that means we will be making the iframe. And so at the very least
        // we need to know which video ID to embed:
        if (
          options === null ||
          typeof options.id !== "string" ||
          !isIdValid(options.id)
        ) {
          // missing or invalid {id: ""}
          log.warn("The options.id is missing or invalid");
          throw new Error("The options.id is missing or invalid");
        }
      }
    }

    // do we have this player already? If so, no need to set it up again and stop now
    if (weakmapPlayer.has(element)) {
      log.info(
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
        //log.info("A message has been received"); // could be from anywhere

        // the event (which we call message to make it clearer what's going on) has
        // an 'origin' and 'data'. Check where it came from:
        if (
          !isVidbeoOrigin(message.origin) ||
          thePlayer.element.contentWindow !== message.source
        ) {
          // ignore it
          log.info("Ah, the message was not from our iframe so ignore it");
          return;
        }

        // now we know the origin (which includes the protocol) of the sender page, keep track of that:
        if (thePlayer.origin === "*") {
          thePlayer.origin = message.origin;
          log.info("The origin is now known:", thePlayer.origin);
        }

        // if the data is sent a string (old browsers) it will be JSON, so parse it as we want an object:
        if (typeof message.data === "string") {
          log.info(
            "The message data is a string so will parse it",
            message.data
          );
          try {
            message.data = JSON.parse(message.data);
          } catch (error) {
            // hmmm could not parse it: that shouldn't happen!
            log.warn(error);
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
          log.warn(
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
          log.warn(
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
          log.info(
            "All good, got success back from the iframe when asking if it was ready",
            message.data
          );

          resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()
          return;
        }

        // 4. it self-reports it is ready without an error in its value, so that means it worked
        if (message.data.type === "event" && message.data.name === "ready") {
          log.info(
            "All good, the iframe has reported it is now ready",
            message.data
          );

          resolve(message.data.value); // currrently the value is just the ID of the video, so might as well pass that along to any then()
          return;
        }

        // ... else it's not ready-related, so process the message data
        log.info(
          "Process this message received from the embedded player",
          message.data
        );
        processMessage(thePlayer, message.data);
      };
      // thePlayer.receivedMessage

      log.info("Listening for any messages sent from the embedded player");
      thePlayer._window.addEventListener("message", thePlayer.receivedMessage);

      // if the Player(element) was NOT an iframe (e.g it was a div) we need to add an iframe
      // to the page to embed the video in that. Which video is based on the options in the second
      // parameter. The advantage of that approach is if params were added to the query string
      // by the user, and one was later changed or added, they would have to update every URL. Whereas
      // done with JS it's much easier to change an object:
      if (thePlayer.element.nodeName !== "IFRAME") {
        log.info(
          "The element passed is NOT already an iframe, so need to make an iframe within that element e.g div"
        );

        // BUT before make the iframe, people may pass wrong params like {madeup: 123}. So need
        // to extract only the ones we actually support either in the query string (like colour) or
        // as iframe attributes (like width):
        let validOptions = extractValidEmbedParams(options);

        // the options MAY have a width AND height, OR have responsive set:
        let sizing = "";
        if (
          validOptions.width &&
          validOptions.height &&
          !isNaN(validOptions.width) &&
          !isNaN(validOptions.height)
        ) {
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
        }

        // armed with the params we can build an iframe src URL and its attributes. So
        // e.g things like 'colour' go in the URL, and things like 'width' go in the iframe:
        let iframe = document.createElement("iframe");
        iframe.setAttribute("src", buildIframeSrc(validOptions)); // this will include e.g ?colour=ff0000
        // how big should the iframe be? We need to set the width and height only if both are present:
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

        // bonus: if the option of responsive is set as true, we add inline styles to their element. We make
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

        log.info("Record the new iframe element in weakmapPlayer");
        weakmapPlayer.set(thePlayer.element, thePlayer);
      }
    });

    // record the Promise and so can then call .ready() before call a method, and if it is ready, let that proceed:
    weakmapIsReady.set(this, onReady);
    weakmapPlayer.set(this.element, this);

    // ask the iframe if it's ready. Why, when it sends a 'ready' event? Well if there was an iframe already on the page
    // that likely has *already* fired an event of 'ready'. And so we would not be aware of that happening. So
    // would wait forever for it. So doesn't hurt to double-check it is ready by asking, and if so, it will
    // send back a message to say so which we listen for above:
    if (this.element.nodeName === "IFRAME") {
      log.info(
        "Send a message to the iframe to ask if it is ready by sending it a message to ask"
      );
      postMessage(this, "ready", null); // the iframe may not have loaded at this point, so may get nothing back, that's ok
    }

    // bonus:
    // there is one player feature that likely will fail when controlled externally using this player API: fullscreen.
    // Why? Because the browser complains it needs user interaction to do that. So we control it further down (rather than send
    // a message to the player, like how other methods work). But as a result, the HTML5 video event of fullscreenchange
    // does not fire and so the player does not know it's now in fullscreen. So its UI is wrong. So need to tell it:
    if (document.fullscreenEnabled) {
      // ah, the page supports the fullscreen API so it should work
      log.info(
        "The HTML5 fullscreen API is supported so listen for the fullscreenchange event"
      );

      this.onDocumentFullscreenchange = function () {
        log.info(
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
          saveCallback(thePlayer, "event:fullscreenexit", function () {
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
          log.info(
            "Send a message to the iframe to tell it the full-screen state has changed as its own HTML5 video event will not fire",
            isFullscreen
          );
          postMessage(thePlayer, "updateFullscreen", isFullscreen); // the method is updateFullscreen and value is whether full-screen now
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
  playerRequestFullscreen (element) {
    log.info("Player.playerRequestFullscreen()");

    // keep a reference to 'this' so can use it inside the function
    let thisRef = this;
    return new Promise(function (resolve, reject) {
      return thisRef
        .ready() // player.ready()
        .then(function () {
          // BUT of course we don't need to send a message to the iframe: we set
          // fullscreen here. So resolve/reject the Promise depending on whether it worked or not, and so
          // the user's method then/catch handler works the same as if we had sent a message to the player
          log.info(
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
                log.info(
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
  playerExitFullscreen () {
    log.info("Player.playerExitFullscren()");

    // keep a reference to 'this' so can use it inside the function
    let thisRef = this;
    return new Promise(function (resolve, reject) {
      return thisRef
        .ready() // player.ready()
        .then(function () {
          // BUT unlike other methods, we don't need to send a message to the iframe. We set
          // fullscreen here. So instead resolve/reject the Promise depending on whether that worked or not, and that means
          // the user's method then/catch handler works the same as if we had sent a message to the player
          if (!(document.fullscreenElement instanceof Element)) {
            log.info(
              "Player.playerExitFullscren() the player is not fullscreen, so nothing to do"
            );
            resolve(false);
          }

          // else the element is fullscreen, so need to exit it
          log.info(
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
                log.info(
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
  method (name = "", value = null) {
    log.info("Player.method()", name, value);

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
          log.info(
            "Player.method() keep a reference to the callback for this method: " +
            name
          );
          saveCallback(thisRef, "method:" + name, {
            resolve: resolve,
            reject: reject,
          });

          log.info(
            "Player.method() send a message to the iframe to call this method: " +
            name,
            value
          );
          postMessage(thisRef, name, value); // e.g 'setVolume' (we don't need to send the type as we will only ever use 'method')
        })
        .catch(reject);
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
  exitFullscreen () {
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
  getBuffered () {
    log.info("Player.getBuffered)");

    return this.method("getBuffered");
  }

  /**
   * getColour
   *
   * @returns {Promise}
   */
  getColour () {
    log.info("Player.getColour()");

    return this.method("getColour");
  }

  /**
   * getCurrentTime
   *
   * @returns {Promise}
   */
  getCurrentTime () {
    log.info("Player.getCurrentTime()");

    return this.method("getCurrentTime");
  }

  /**
   * getDuration
   *
   * @returns {Promise}
   */
  getDuration () {
    log.info("Player.getDuration()");

    return this.method("getDuration");
  }

  /**
   * getEmbed
   *
   * @returns {Promise}
   */
  getEmbed () {
    log.info("Player.getEmbed()");

    return this.method("getEmbed");
  }

  /**
   * getEnded
   *
   * @returns {Promise}
   */
  getEnded () {
    log.info("Player.getEnded()");

    return this.method("getEnded");
  }

  /**
   * getFullscreen
   *
   * @returns {Promise}
   */
  getFullscreen () {
    log.info("Player.getFullscreen()");

    return this.method("getFullscreen");
  }

  /**
   * getHeight
   *
   * @returns {Promise}
   */
  getHeight () {
    log.info("Player.getHeight()");

    return this.method("getHeight");
  }

  /**
   * getId
   *
   * @returns {Promise}
   */
  getId () {
    log.info("Player.getId()");

    return this.method("getId");
  }

  /**
   * getLoop
   *
   * @returns {Promise}
   */
  getLoop () {
    log.info("Player.getLoop()");

    return this.method("getLoop");
  }

  /**
   * getMuted
   *
   * @returns {Promise}
   */
  getMuted () {
    log.info("Player.getMuted()");

    return this.method("getMuted");
  }

  /**
   * getPaused
   *
   * @returns {Promise}
   */
  getPaused () {
    log.info("Player.getPaused()");

    return this.method("getPaused");
  }

  /**
   * getPlaybackRate
   *
   * @returns {Promise}
   */
  getPlaybackRate () {
    log.info("Player.getPlaybackRate()");

    return this.method("getPlaybackRate");
  }

  /**
   * getPlayed
   *
   * @returns {Promise}
   */
  getPlayed () {
    log.info("Player.getPlayed()");

    return this.method("getPlayed");
  }

  /**
   * getQualities
   *
   * @returns {Promise}
   */
  getQualities () {
    log.info("Player.getQualities()");

    return this.method("getQualities");
  }

  /**
   * getQuality
   *
   * @returns {Promise}
   */
  getQuality () {
    log.info("Player.getQuality()");

    return this.method("getQuality");
  }

  /**
   * getSeekable
   *
   * @returns {Promise}
   */
  getSeekable () {
    log.info("Player.getSeekable()");

    return this.method("getSeekable");
  }

  /**
   * getSeeking
   *
   * @returns {Promise}
   */
  getSeeking () {
    log.info("Player.getSeeking()");

    return this.method("getSeeking");
  }

  /**
   * getTracks
   *
   * @returns {Promise}
   */
  getTracks () {
    log.info("Player.getTracks()");

    return this.method("getTracks");
  }

  /**
   * getTitle
   *
   * @returns {Promise}
   */
  getTitle () {
    log.info("Player.getTitle()");

    return this.method("getTitle");
  }

  /**
   * getUrl
   *
   * @returns {Promise}
   */
  getUrl () {
    log.info("Player.getUrl()");

    return this.method("getUrl");
  }

  /**
   * getVolume
   *
   * @returns {Promise}
   */
  getVolume () {
    log.info("Player.getVolume()");

    return this.method("getVolume");
  }

  /**
   * getWidth
   *
   * @returns {Promise}
   */
  getWidth () {
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
  off (event = "", callback = null) {
    log.info("Player.off()", event);

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
      log.info(
        "Player.off() tell the player iframe to no longer report this event",
        event
      );
      this.method("off", event).catch(function () { });
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
  on (event = "", callback = null) {
    log.info("Player.on()", event);

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
      log.info(
        "Player.on() tell the embedded player the page is interested in being notified about this event",
        event
      );
      this.method("on", event).catch(function () { });
    }

    log.info("Player.on() record the callback function for", event);
    saveCallback(this, "event:" + event, callback);
  }

  /**
   * pause
   *
   * @returns {Promise}
   */
  pause () {
    log.info("Player.pause()");

    return this.method("pause");
  }

  /**
   * play
   *
   * @returns {Promise}
   */
  play () {
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
  ready () {
    log.info("Player.ready()");

    // if a promise has already been created, get it. Else reject as the player can't have
    // been set up (like if someone does player.ready() without first calling Vidbeo.Player(...))
    let promise =
      weakmapIsReady.get(this) ||
      new Promise(function (resolve, reject) {
        log.info(
          "Player.ready(): the player has not reported itself as being ready"
        ); // not an error
        reject(new Error("Player is not configured"));
      });

    // return a Promise
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
  requestFullscreen () {
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
  setColour (value) {
    log.info("Player.setColour()", value);

    return this.method("setColour", value);
  }

  /**
   * setCurrentTime
   *
   * @param {Number} value In seconds e.g 5
   * @returns {Promise}
   */
  setCurrentTime (value) {
    log.info("Player.setCurrentTime()", value);

    return this.method("setCurrentTime", value);
  }

  /**
   * setLoop
   *
   * @param {Boolean} value
   * @returns {Promise}
   */
  setLoop (value) {
    log.info("Player.setLoop()", value);

    return this.method("setLoop", value);
  }

  /**
   * setMuted
   *
   * @param {Boolean} value
   * @returns {Promise}
   */
  setMuted (value) {
    log.info("Player.setMuted()", value);

    return this.method("setMuted", value);
  }

  /**
   * setPlaybackRate
   *
   * @param {Number} value Between 0.5 and 2 e.g 1.5 (for 1.5x)
   * @returns {Promise}
   */
  setPlaybackRate (value) {
    log.info("Player.setPlaybackRate()", value);

    return this.method("setPlaybackRate", value);
  }

  /**
   * setQuality
   *
   * @param {String} value e.g '360p'
   * @returns {Promise}
   */
  setQuality (value) {
    log.info("Player.setQuality()", value);

    return this.method("setQuality", value);
  }

  /**
   * setVolume
   *
   * @param {Number} value Between 0 and 1 e.g 0.5 for 50% volume
   * @returns {Promise}
   */
  setVolume (value) {
    log.info("Player.setVolume()", value);

    return this.method("setVolume", value);
  }
}

export default Player;
