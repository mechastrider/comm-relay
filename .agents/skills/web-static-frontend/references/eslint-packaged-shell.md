# ESLint guards for packaged desktop shells

Use when the static admin (and optional dock) UI also runs inside an embedded webview. Copy the patterns into the consumer repo’s `eslint.config.js` (flat config) and adjust `files` / `ignores` to match your tree.

## Block native blocking dialogs (admin + dock)

```javascript
const forbidNativeBrowserDialogs = {
  "no-restricted-globals": [
    "error",
    { name: "confirm", message: "Use an in-app dialog instead." },
    { name: "alert", message: "Use application UI instead." },
    { name: "prompt", message: "Use application UI instead." },
  ],
  "no-restricted-properties": [
    "error",
    { object: "window", property: "confirm", message: "Use an in-app dialog instead." },
    { object: "window", property: "alert", message: "Use application UI instead." },
    { object: "window", property: "prompt", message: "Use application UI instead." },
    { object: "globalThis", property: "confirm", message: "Use an in-app dialog instead." },
    { object: "globalThis", property: "alert", message: "Use application UI instead." },
    { object: "globalThis", property: "prompt", message: "Use application UI instead." },
  ],
};

// Example: { files: ["web/admin/**/*.js", "web/dock/**/*.js"], rules: forbidNativeBrowserDialogs }
```

## Centralize blob downloads

Pick one module (e.g. `web/shared/desktop-save.js`) as the only place that may use `URL.createObjectURL` and `link.download` for operator exports.

```javascript
const forbidAdHocBlobDownload = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.property.name='createObjectURL']",
      message:
        "Route blob downloads through the shared desktop-save module (native dialog + browser fallback).",
    },
    {
      selector:
        "AssignmentExpression[left.type='MemberExpression'][left.property.name='download']",
      message: "Route file saves through the shared desktop-save module.",
    },
  ],
};

// Example: { files: ["web/**/*.js"], ignores: ["web/shared/desktop-save.js"], rules: forbidAdHocBlobDownload }
```

Run `npm run lint` (or equivalent) in CI so regressions fail before merge.
