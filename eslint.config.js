import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "cmd/**"],
  },
  js.configs.recommended,
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
    files: ["web/admin/**/*.js"],
    rules: {
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
    },
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
