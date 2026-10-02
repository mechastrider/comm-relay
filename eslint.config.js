import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const forbidNativeBrowserDialogs = {
  "no-restricted-globals": [
    "error",
    { name: "confirm", message: "Use the shared in-app discard dialog instead." },
    { name: "alert", message: "Use an application UI component instead." },
    { name: "prompt", message: "Use an application UI component instead." },
  ],
  "no-restricted-properties": [
    "error",
    { object: "window", property: "confirm", message: "Use the shared in-app discard dialog instead." },
    { object: "window", property: "alert", message: "Use an application UI component instead." },
    { object: "window", property: "prompt", message: "Use an application UI component instead." },
    { object: "globalThis", property: "confirm", message: "Use the shared in-app discard dialog instead." },
    { object: "globalThis", property: "alert", message: "Use an application UI component instead." },
    { object: "globalThis", property: "prompt", message: "Use an application UI component instead." },
  ],
};

const forbidAdHocBlobDownload = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.property.name='createObjectURL']",
      message:
        "Route blob downloads through saveBlobWithDialog in /shared/desktop-save.js (native save dialog in desktop + browser fallback).",
    },
    {
      selector:
        "AssignmentExpression[left.type='MemberExpression'][left.property.name='download']",
      message:
        "Route file saves through saveBlobWithDialog in /shared/desktop-save.js.",
    },
  ],
};

export default [
  {
    ignores: ["node_modules/**", "cmd/**", "web/admin/dist/**", "playwright-report/**", "test-results/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map(config => ({ ...config, files: ["web/admin/src/**/*.{ts,tsx}", "web/e2e/**/*.ts"] })),
  {
    files: ["web/admin/src/**/*.{ts,tsx}", "web/e2e/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["web/admin/src/**/*.{ts,tsx}"],
    rules: { ...forbidNativeBrowserDialogs, ...forbidAdHocBlobDownload, "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "error" },
  },
  {
    files: ["web/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["web/admin/**/*.js", "web/dock/**/*.js"],
    rules: forbidNativeBrowserDialogs,
  },
  {
    files: ["web/**/*.js"],
    ignores: ["web/shared/desktop-save.js"],
    rules: forbidAdHocBlobDownload,
  },
  {
    files: ["web/**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
