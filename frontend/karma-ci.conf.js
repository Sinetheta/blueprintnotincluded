var properties = null;
var originalConfigFn = require("./karma.conf.js");
originalConfigFn({
  set: function (arg) {
    properties = arg;
  },
});

properties.colors = false;
properties.singleRun = true;
properties.autoWatch = false;
properties.browsers = ["ChromeHeadlessCI"];
(properties.customLaunchers = {
  ChromeHeadlessCI: {
    base: "ChromeHeadless",
    flags: ["--no-sandbox"],
  },
}),
  (module.exports = function (config) {
    config.set(properties);
  });
