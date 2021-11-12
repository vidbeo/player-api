# Player API

Use our Player API to control a player embedded on your site using JavaScript.

## Installation

Since your page and our embed code are on different domains, you need to add our script to your page to enable them to communicate. This loads the latest version from our CDN:

```html
<script type="text/javascript" src="https://player.vidbeo.com/sdk/api.js"></script>
```

If you are using a bundler like rollup or webpack you can install it using npm:

```
npm install @vidbeo/player-api
```

## Initialisation

If you _already_ have one of our iframes on your page, you simply need to pass a reference to that _Element_. For example:

```html
<script type="text/javascript" src="https://player.vidbeo.com/sdk/api.js"></script>
<script>
var iframe = document.querySelector('iframe');
var player = new Vidbeo.Player(iframe);
</script>
```

If you _don't_ already have one of our iframes on your page, we can add one for you. You just need to have an empty _div_ Element into which the video will be embedded.

Pass its ID as the first parameter.

And of course we need to know which video to embed, so pass the video's unique ID within the options parameter (you can use additional options to customise it - here we set a _width_ and _height_ too):

```html
<div id="put-video-here"></div>

<script type="text/javascript" src="https://player.vidbeo.com/sdk/api.js"></script>
<script>
var player = new Vidbeo.Player('put-video-here', {
    id: 'thevideoid',
    width: 640,
    height: 360
});
</script>
```

**Note:** The order matters as the _div_ has to be part of the page (the DOM) before the script runs. Else you will see errors about it being _null_. The easiest way to solve that is by putting the script at the end of your page (before the closing `</body>` tag).

If you are using a bundler like [rollup](https://rollupjs.org) you can install the Player using npm and then initialise it in the same way:

```javascript
import Player from '@vidbeo/player-api';

const player = new Player('put-video-here', {
    id: 'thevideoid',
    width: 640,
    height: 360
});
```

You should now have a `player` variable to work with. For example to check the player is ready

```javascript
player.ready().then(function(data) {
    console.log('Player is ready');
}).catch(function(error) {
    console.error('Player is not ready', error);
});
```

## Options

If your iframe is _already_ on the page, its appearance will already have been set by a combination of the iframe's attributes (like its width and height) and the player's own attributes (like its colour).

However if you are using the Player API to dynamically add a video embed to the page, you can use the full range of options. These are passed in the second parameter, as an Object, as shown above.

The full list of options:

| Option       | Type      | Default | Description   |
| ------------ | --------- | ------- | ------------- |
| aspectratio  | String    | "16:9"  | The aspect ratio the player should show the video at. We support "16:9", "21:9", "4:3" (this applies only if you also set _responsive_ as _true_) |
| autoplay     | Boolean    | false   | Should the video start playing on-load? |
| colour       | String    | ''      | A custom colour as a six-character hex, such as _"00b894"_ |
| controls     | Boolean   | true    | Should controls be shown? |
| buttons      | String    | ''      | If empty, the default buttons will be shown (recommended). But you can override that by specifying a comma-separated string of button names. For example "main_play,play,progress,fullscreen" |
| dnt          | Boolean   | false   | A 'Do Not Track' option. If set as true, analytics events normally sent by the player will not be sent |
| height       | Number    | N/A     | If you would like to embed a video at a _fixed_ size, provide its height (such as 360) |
| id           | String    | ''      | You must provide the unique ID of a video to embed: it will look something like _uk1vabcde23445abcde_ |
| jwt          | String    | ''      | A video can be set to require authentication. If so, you can provide a JSON Web Token (JWT) in this field |
| keyboard     | Boolean   | true    | Enable keyboard controls?
| loop         | Boolean   | false   | Should the video restart when it ends? |
| muted        | Boolean   | false   | Should the video be muted when it loads? You will likely need to set this as true if you set _autoplay_ as _true_, as browsers usually block videos from auto-playing that are _not_ muted |
| playsinline | Boolean    | true    | On mobile device, should the video play within the page (rather than automatically move into fullscreen mode) |
| preload     | Boolean    | true    | On desktop (where this can be controlled) should the player buffer a short amount of the video on-load? This improves performance as the video can then start playing immediately _but_ if the viewer does _not_ play the video, it may waste a little data |
| quality    | String     | 'auto'  | Our player will automatically try to play the best quality based on the available connection speed. Which can vary. However on desktop (where this can be controlled) you may want to override that behaviour and force it to pick the highest available quality on-load. If so, set this as _"highest"_ |
| responsive | Boolean | true | Most modern sites adapt to the width of the screen to work well on both desktop and mobile. You therefore don't need to set a _width_ or _height_ value. If you would like to control the responsive behaviour in your own CSS you must set this as _false_. That tells our player _you_ will be handling its size and so it should not add its own CSS |
| t         | Number | 0 | A time in seconds to skip forward to on-load |
| title     | Boolean | false | Should the video's title be shown within the player? |
| track     | String | '' | If your video has subtitles or closed-captions, you may want them turned on immediately on-load. If so, set the language code of the one to use (as you may have multiple ones). For example to enable English captions on-load, set this as _"en"_ |
| width     | Number | N/A | If you would like to embed a video at a _fixed_ size, provide its width (such as 640) |

## Methods

Call the methods on your `player`.

**Note:** Most methods return a _Promise_ so you can handle/catch the response to see if the request succeeded. Our examples below demonstrate that. Or you can simply call the method like `player.play()` without using the _then()_ or _catch()_.

### Actions

#### play()

Play the video if it's paused.

```javascript
player.play().then(function() {
    console.log('Success');
}).catch(function(error) {
    console.error('Error', error);
});
```

#### pause()

Pause the video if it's playing.

```javascript
player.pause().then(function() {
    console.log('Success');
}).catch(function(error) {
    console.error('Error', error);
});
```

#### ready()

See if the player is ready.

**Note:** Generally you don't need to use this yourself (like before calling other methods) as we check the player is ready internally.

```javascript
player.ready().then(function() {
    console.log('Success');
}).catch(function(error) {
    console.error('Error', error);
});
```

#### requestFullscreen()

Enter fullscreen mode.

Be aware that if you toggle fullscreen mode using an external button, that button will of course be covered up by the player once it goes fullscreen.

```javascript
player.requestFullscreen().then(function() {
    console.log('Success');
}).catch(function(error) {
    console.error('Error', error);
});
```

#### exitFullscreen()

Exit fullscreen mode.

```javascript
player.exitFullscreen().then(function() {
    console.log('Success');
}).catch(function(error) {
    console.error('Error', error);
});
```

### Getters

These are the methods that return a value to the _Promise_.

#### getColour(): String

Get the colour of the player as a six-character hex. An empty string (the default) means the default colour is being used.

For example:
`00b894`

```javascript
player.getColour().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getCurrentTime(): Number

Get the current time. The value is a number in seconds.

For example:
`11.1`

```javascript
player.getCurrentTime().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getDuration(): Number

Get the duration of the video, once it's known. It will only be known once the video's metadata is loaded. The value is in seconds.

For example:
`15`

```javascript
player.getDuration().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getEmbed(): String

Get an iframe embed code for the video. It is a snippet of HTML.

```javascript
player.getEmbed().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getEnded(): Boolean

See if the video has ended.

For example:
`false`

```javascript
player.getEnded().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getFullscreen(): Boolean

See if the video is currently fullscreen.

For example:
`false`

```javascript
player.getFullscreen().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getHeight(): Number

Get the height of the video (not the height it is embeddeed at).

It is only known once the video's metadata has downloaded.

For example:
`720`

```javascript
player.getHeight().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getId(): String

Get the ID of the embedded video.

For example:
`abcdefgh1234567`

```javascript
player.getId().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getLoop(): Boolean

See if the video is set to loop (restart when it ends).

For example:
`false`

```javascript
player.getLoop().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getMuted(): Boolean

See if the video is muted.

For example:
`false`

```javascript
player.getMuted().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getPaused(): Boolean

See if the video is paused.

For example:
`false`

```javascript
player.getPaused().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getPlaybackRate(): Number

Get the playback rate. The default is 1 (meaning _1x_). The possible values are currently 0.5, 1, 1.5 or 2.

For example:
`0.5`

```javascript
player.getPlaybackRate().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getPlayed(): Array

Get the time period(s) during which the video has been played. This is a 2D array. The start and end values are in seconds.

For example:
`[[0,4.367],[6,8.738]]`

```javascript
player.getPlayed().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getProgress(): Array

Get the part(s) of the video that have been buffered. The data is returned as a 2D array. The start and end values are in seconds.

For example:
`[[0,8]]`

```javascript
player.getBuffered().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getQualities(): Array

Get the available qualities. At a minimum there is an "auto" quality. Once the video's metadata is loaded and so the qualities are known, you may want to manually set a particular quality to be used. You would send one of these values.

For example:
`["360p","720p","1080p","auto"]`

```javascript
player.getQualities().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getQuality(): String

Get the currently selected quality. The default value is "auto" which means it is left up to the player to decide the quality depending on the connection speed. However you may override that to be a particular quality.

For example:
`"720p"`

```javascript
player.getQuality().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getSeekable(): Array

Get the time period(s) that are seekable within. This is a 2D array, with each element being an array of _[start,end]_. All values are in seconds.

For example:
`[[0,11.4]]`

```javascript
player.getSeekable().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getSeeking(): Boolean

Is the video _currently_ seeking?

For example:
`false`

```javascript
player.getSeeking().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getTracks(): Array

Get the available subtitles or closed captions. This is an array of objects. If the video does not have any tracks, it will be empty.

For example:
`[{"id":"abcdefgh1234567","kind":"captions","language":"en","label":"English","mode":"disabled"}]`

```javascript
player.getTracks().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getTitle(): String

Get the title of the embedded video.

For example:
`"An example video"`

```javascript
player.getTitle().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getUrl(): String

Get a URL to the video that can be shared or emailed.

For example:
`"https://watch.vidbeo.com/abcdefghikl12345"`

```javascript
player.getUrl().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getVolume(): Number

Get the current volume. It is as a number between 0 and 1.

For example:
`0.5`

```javascript
player.getVolume().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### getWidth(): Number

Get the width of the video. This is only known once the video's metadata has been downloaded.

For example:
`1920`

```javascript
player.getWidth().then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

### Setters

For these methods you need to pass a value as its parameter. Generally we echo the same value back on success.

#### setColour(colour: String): String

Set the colour of the player. We use a neutral palette which works well on most sites but you can apply your own accent colour. It should be a six-character string using the hex format.

For example:
`6c5ce7`

```javascript
player.setColour("6c5ce7").then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setCurrentTime(time: Number): Number

Seek to a particular time. The value should be a time in seconds. It must be greater than 0, and less than the duration of the video

For example:
`8`

```javascript
player.setCurrentTime(8).then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setLoop(loop: Boolean): Boolean

Set whether the video should loop when it ends. The value should be a boolean.

For example:
`true`

```javascript
player.setLoop(true).then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setMuted(muted: Boolean): Boolean

Set whether the video should be muted. The value should be a boolean.

For example:
`true`

```javascript
player.setMuted(true).then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setPlaybackRate(rate: Number): Number

Set the playback speed. Since browsers do not reliably support some speeds, currently the value should be one of these numbers: _0.5_, _1_, _1.5_, _2_.

For example:
`1.5`

```javascript
player.setPlaybackRate(1.5).then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setQuality(quality: String): String

Set the quality. The default is "auto" which leaves the player to optimise the quality based on the available connection speed. However you can manually set a quality (from those available, as reported by _getQualities()_) such as "1080p" to override that.

For example:
`1080p`

```javascript
player.setQuality("1080p").then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

#### setVolume(volume: Number): Number

Set the volume. It should be a number between 0 and 1.

For example:
`0.5`

```javascript
player.setVolume(0.5).then(function(data) {
    console.log('Success', data);
}).catch(function(error) {
    console.error('Error', error);
});
```

## Events

Use the _on_ method to register a callback function and the _off_ method to remove it. Unlike the methods above, these two do not return a _Promise_.

#### on(event: String, callback: Function)

Here we are listening for the _playing_ event. The second parameter needs to be a function: that is the callback that is run when the event is fired.

```javascript
player.on('playing', function(data) {
    console.log('playing', data);
});
```

#### off(event: String, callback: Function)

Here we are no longer listening for the _playing_ event and want to remove _all_ callbacks:

```javascript
player.off('playing');
```

If you want to remove a specific callback, pass that function as the optional second parameter:

```javascript
const onPlaying = function(data) {
    console.log('playing', data);
};
player.off('playing', onPlaying);
```

#### All events

These are the events you can listen for, along with an example of data passed to the callback you register using **on()**.

The names of the events should hopefully be self-explanatory. We generally use the standard HTML5 video events.

The data gives a summary of the state at that moment. For example if the volume changes, we also return the current volume. You can of course subsequently use the various _get_ methods to return additional data you need.

| Event                | Data type | Example data passed to callback               |
| -------------------- | --------- | --------------------------------------------- |
| durationchange       | Object    | {"duration":11.4}                             |
| ended                | Object    | {"seconds":11.4,"percentage":100}             |
| fullscreenchange     | Object    | {"fullscreen":true}                           |
| hotspotclicked       | Object    | {"id":"abcdefgh12345678","seconds":5}         |
| loadedmetadata       | Object    | {"videoWidth":1920,"videoHeight":1080}        |
| pause                | Object    | {"seconds":7.235,"percentage":63.461}         |
| play                 | Object    | {"seconds":1.341,"percentage":11.761}         |
| playing              | Object    | {"seconds":1.341,"percentage":11.767}         |
| progress             | Object    | {"percentage":100}                            |
| qualitychange        | Object    | {"quality":"720p"}                            |
| playbackratechange   | Object    | {"playbackRate":1.5}                          |
| seeked               | Object    | {"seconds":5,"percentage":43.86}              |
| seeking              | Object    | {"seconds":5,"percentage":43.86}              |
| trackchange          | Object    | {"language":"en"}                             |
| timeupdate           | Object    | {"seconds":7.648,"percentage":67.089}         |
| volumechange         | Object    | {"volume":0.82}                               |

