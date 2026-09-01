/** Dev-only: proxy comm-relay-server and reload when web/ assets change. */
module.exports = {
  proxy: "http://127.0.0.1:17877",
  files: ["web/**/*.css", "web/**/*.js", "web/**/*.html"],
  host: "127.0.0.1",
  port: 17878,
  open: false,
  notify: false,
  ui: false,
  ghostMode: false,
  injectChanges: true,
  reloadDebounce: 200,
  logLevel: "info",
  logPrefix: "live",
};
