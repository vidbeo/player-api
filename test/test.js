import test from "ava";
import sinon from "sinon";
import Player from "../src/api";
import {
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
} from "../src/functions";

test("tests are working", (t) => {
  t.is(1 + 1, 2);
});

test("isBrowser reports correctly", (t) => {
  t.true(isBrowser); // simulated via browser-env
});

test("supportsPostMessage reports correctly", (t) => {
  t.true(supportsPostMessage); // because we are using browser-env
});

test("isServer reports correctly", (t) => {
  t.true(isServer);
});

test("isIdValid returns false for an invalid video id", (t) => {
  t.false(isIdValid("madeup"));
});

test("isIdValid returns true for a valid video id", (t) => {
  t.true(isIdValid("uk1vy9x3yq5b515xvfhv2"));
});

test("extractValidEmbedParams extracts out only the valid option when passed extra invalid ones", (t) => {
  const params = { id: "id", madeup: 123, invalid: "abcde" };

  const validParams = extractValidEmbedParams(params);

  const expectedParams = { id: "id" };

  t.deepEqual(validParams, expectedParams);
});

test("buildIframeSrc builds a valid URL which includes only applicable params passed to it", (t) => {
  // the id should be in the path, the colour should be in the query params, and the
  // width and height should not be present at all as they are part of the Element, not URI:
  const options = {
    id: "uk1vy9x3yq5b515xvfhv2",
    width: 640,
    height: 360,
    colour: "00ffff",
  };

  const src = buildIframeSrc(options);

  const expectedSrc =
    "https://embed.vidbeo.com/uk1vy9x3yq5b515xvfhv2?colour=00ffff";

  t.is(src, expectedSrc);
});

test("postMessage sends a message for a method which does not need a value", (t) => {
  // use sinon spy:
  const spy = sinon.spy();

  // simulated player iframe the message will be sent to
  const player = {
    element: {
      contentWindow: {
        postMessage: spy,
      },
    },
    origin: "example.com",
  };

  // note: its third param is not needed as that is the value used for e.g setColour
  postMessage(player, "exampleMethod", null);

  t.true(spy.called);

  // the message we sent has a type, a name, and any value (which may be null):
  t.true(
    spy.calledWith(
      { type: "method", name: "exampleMethod", value: null },
      "example.com"
    )
  );
});

test("postMessage sends a message with value for a method which does need a value", (t) => {
  // use sinon spy:
  const spy = sinon.spy();

  // simulated player iframe the message will be sent to
  const player = {
    element: {
      contentWindow: {
        postMessage: spy,
      },
    },
    origin: "example.com",
  };

  // note: third param is needed for some methods e.g setColour
  postMessage(player, "setColour", "00ffff");

  t.true(spy.called);

  // the message we sent has a type, a name, *and* a value:
  t.true(
    spy.calledWith(
      { type: "method", name: "setColour", value: "00ffff" },
      "example.com"
    )
  );
});

test("saveCallback saves callback", (t) => {
  const callback = function () {};

  const player = {
    element: {},
  };

  // note: the label param is 'type:name' though that doesn't matter here
  saveCallback(player, "event:test", callback);

  // if that worked, there should be a 'name' key added to the  weakmap:
  t.true("event:test" in weakmapCallbacks.get(player.element));
  // ... and the only callback should be our just added callback:
  t.true(weakmapCallbacks.get(player.element)["event:test"][0] === callback);
});

test("getCallbacks gets callbacks", (t) => {
  const callback = function () {};

  const player = {
    element: {},
  };

  // the key is a label like 'type:name' and the value is an array (as may be multiple callbacks
  // for an event). Here, add one element to that array, our callback:
  weakmapCallbacks.set(player.element, { "event:test": [callback] });

  // if the function works, it should be there as the one and only callback:
  t.deepEqual(getCallbacks(player, "event:test"), [callback]);
});

test("making a player using no element as first param fails", async (t) => {
  await t.throwsAsync(
    async () => {
      new Player(null);
    },
    {
      instanceOf: Error,
      message: "The first parameter must be a valid id or element",
    }
  );
});

test("making a player using a valid element but no options param to tell it the video to embed fails", async (t) => {
  await t.throwsAsync(
    async () => {
      new Player(htmlElement("<div></div>"), null);
    },
    { instanceOf: Error, message: "The options.id is missing or invalid" }
  );
});

test("making a player using a valid element with options but no options.id fails", async (t) => {
  await t.throwsAsync(
    async () => {
      new Player(htmlElement("<div></div>"), { madeup: 123 });
    },
    { instanceOf: Error, message: "The options.id is missing or invalid" }
  );
});

test("making a player using an iframe which has no src fails", async (t) => {
  await t.throwsAsync(
    async () => {
      new Player(htmlElement("<iframe></iframe>"));
    },
    {
      instanceOf: Error,
      message:
        "The first parameter is an iframe but not a valid embedded video",
    }
  );
});

test("making a player using an existing iframe with a src which is invalid fails", async (t) => {
  await t.throwsAsync(
    async () => {
      new Player(htmlElement('<iframe src="https://example.com"></iframe>'), {
        madeup: 123,
      });
    },
    {
      instanceOf: Error,
      message:
        "The first parameter is an iframe but not a valid embedded video",
    }
  );
});

test("creating a player with a valid existing iframe element works", async (t) => {
  // simulate one by appending an iframe to DOM:
  const i = document.createElement("iframe");
  i.width = 640;
  i.height = 360;
  i.src = "https://embed.vidbeo.com/uk1vy9x3yq5b515xvfhv2";
  document.body.appendChild(i);

  // ... then fetch it, as would do on a page:
  const iframe = document.querySelector("iframe");
  const player = new Player(iframe);

  // check it does not throw an error
  t.true(player.ready() instanceof Promise);
  await t.notThrows(() => player.ready());
});

test("a player can have callbacks attached using on to listen for events", (t) => {
  // can't use a HTML page so simulate one by appending an iframe to DOM:
  const i = document.createElement("iframe");
  i.width = 640;
  i.height = 360;
  i.src = "https://embed.vidbeo.com/uk1vy9x3yq5b515xvfhv2";
  document.body.appendChild(i);

  // then fetch it, as would do on a page:
  const iframe = document.querySelector("iframe");
  const player = new Player(iframe); // no options needed

  // it should be possible to use 'on' to attach a calllback to listen for an event e.g on timeupdate:
  t.notThrows(() => player.on("timeupdate", () => {}));

  // ... while these all fail due to missing/invalid params
  t.throws(() => player.on(), {
    instanceOf: Error,
    message: "An event is required",
  });
  t.throws(() => player.on("madeupeevent"), {
    instanceOf: Error,
    message: "That event is currently not supported",
  });
  t.throws(() => player.on("timeupdate"), {
    instanceOf: Error,
    message: "A callback is required and it must be a function",
  });
  t.throws(() => player.on("timeupdate", "notafunction"), {
    instanceOf: Error,
    message: "A callback is required and it must be a function",
  });
});
