const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined"; // a browser has a 'window'

const isServer =
    (typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null) ||
    typeof caches.default != null; // detect Node or CF

const supportsPostMessage =
    typeof window !== "undefined" && typeof window.postMessage !== "undefined";

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

const weakmapCallbacks = new WeakMap(); // note: we store event and method callbacks in the same map

/**
 * Is the element used with the Vidbeo.Player(element) already one of our iframes?
 *
 * @param {Element} element
 * @return {Boolean}
 */
function isVidbeoIframe (element) {
    //log.info("isVidbeoIframe");

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

    // does its src use our domain? This can be refined with a regex maybe to check the ID too
    if (!src.startsWith("https://embed.vidbeo.com")) {
        return false;
    }

    // else looks good
    //log.info("isVidbeoIframe: it is");
    return true;
}

/**
 * Is the origin of a message from our iframe's domain?
 *
 * @param {String} domain
 * @returns {Boolean}
 */
function isVidbeoOrigin (origin) {
    //log.info("isVidbeoOrigin", origin);

    if (!origin || origin == null || origin === "") {
        return false;
    }

    let permittedOrigins = ["https://embed.vidbeo.com"];

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
function postMessage (player, name = "", value = null) {
    //log.info("postMessage", name, value);

    // check the player iframe has a window we can post the message to:
    if (
        !player.element.contentWindow ||
        !player.element.contentWindow.postMessage
    ) {
        //log.warn("The iframe embed could not be contacted");
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
function processMessage (player, data) {
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
        //log.info("processMessage the message says there was an error", data);

        // see if there was a catch/error handler for this method/event:
        let promises = getCallbacks(player, data.type + ":" + data.name); // e.g "method:setVolume"
        promises.forEach(function (promise) {
            log.info(
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
            //log.info("processMessage this message was in response to a method", data);

            // unlike an event, which will always have a callback to receive the value, methods may not have a callback. Someone
            // might call e.g player.setVolume(0.5) with no .then/.catch afterwards
            var callback = shiftCallbacks(player, "method:" + data.name); // since we use one array, prefix with [type:]
            if (callback) {
                log.info("processMessage there was a callback for method:" + data.name);
                callbacks.push(callback);
                valueToReturn = data.value;
            }
        }

        if (data.type === "event") {
            //log.info("processMessage this message was to notify an event", data);

            // an event should have at least one callback
            callbacks = getCallbacks(player, "event:" + data.name);
            valueToReturn = data.value;
        }

        // call each callback in the array
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
            } catch (e) {
                //log.error(e);
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
function saveCallback (player, label, callback) {
    //log.info("saveCallback", label);

    // get all the callbacks so far for this player
    let callbacks = weakmapCallbacks.get(player.element) || {};
    if (!(label in callbacks)) {
        // it's NOT already in there, so initialise it with an array. Use an array
        // as someone may want multiple callbacks for the same event
        //log.info("saveCallback: initialise the array for:", label);
        callbacks[label] = [];
    }

    // add it
    //log.info("saveCallback: push on to the array the callback for:", label);
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
function getCallbacks (player, label) {
    //log.info("getCallbacks", label);

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
function removeCallback (player, label, callback) {
    //log.info("removeCallback", label);

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
function swapCallbacks (from, to) {
    //log.info("swapCallbacks");

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
function shiftCallbacks (player, label) {
    //log.info("shiftCallbacks", label);

    let callbacks = getCallbacks(player, label); // e.g "event:timeupdate"

    if (callbacks.length === 0) {
        // there are none set, so can't
        return false;
    }

    let callback = callbacks.shift();
    removeCallback(player, label, callback);

    // return the removed one:
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
function extractValidEmbedParams (options = {}) {
    //log.info("extractValidEmbedParams", options);

    let acceptedOptions = {}; // assume none

    // these are all the supported options {} values which are used either in constructing an iframe (e.g 'width') or passed
    // in the iframe's src URL (e.g 'colour'). And within those query string params are ones that may be checked server-side (e.g 'jwt') *or*
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
function isIdValid (id = "") {
    //log.info("isIdValid", id);

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
function buildIframeSrc (options = {}) {
    //log.info("buildIframeSrc", options);

    // double-check there is an id:
    //log.info("buildIframeSrc: check for an id");
    if (!options || typeof options.id !== "string" || !isIdValid(options.id)) {
        return "";
    }

    let src = "https://embed.vidbeo.com/" + options.id;
    // next we need to include params in the query string based on the options. Some
    // options are used for iframe attributes, like width and height. However ones
    // like colour are passed to the iframe in the query string. So there is a consistent
    // way for people that aren't using the JS SDK:
    //log.info("buildIframeSrc: build query string");
    let queryStringParams = []; // assume none
    for (let [key, value] of Object.entries(options)) {
        //log.info("buildIframeSrc", key, value);

        // first, exclude any options that should not be in the query string
        if (["aspectratio", "height", "id", "responsive", "width"].includes(key)) {
            //log.info("buildIframeSrc skipping over this as its not relevant to the query string", key);
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

    //log.info("buildIframeSrc queryStringParams", queryStringParams);

    if (queryStringParams.length > 0) {
        src += "?" + queryStringParams.join("&"); // join key=value with &
    }

    //log.info("buildIframeSrc src", src);
    return src;
}

/**
 * Make a HTML element from a string of HTML
 *
 * @param {String} html
 * @returns {Element}
 */
function htmlElement (html = "") {
    const element = document.createElement("div");
    element.innerHTML = html;
    return element.firstChild;
}

module.exports = {
    isBrowser,
    isServer,
    supportsPostMessage,
    supportedEvents,
    supportedMethods,
    weakmapCallbacks,
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
    htmlElement,
};
