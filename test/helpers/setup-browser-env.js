// needed for using the DOM (which is not available in Node) in a test
// and it's why "./test/helpers/setup-browser-env.js" is in the package.json
// in ava's require {}. So should then be able to access document as a global
// in ava tests and it will think it is in a browser
// https://github.com/lukechilds/browser-env
require("browser-env")();
