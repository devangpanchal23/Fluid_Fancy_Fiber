import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = Object.fromEntries(
  [
    "AbortController", "Blob", "DOMException", "Event", "File", "FileReader", "FormData",
    "HTMLElement", "HTMLVideoElement", "Image", "IntersectionObserver", "MutationObserver",
    "ResizeObserver", "TextEncoder", "URL", "URLSearchParams", "XMLHttpRequest", "alert", "atob", "btoa",
    "cancelAnimationFrame", "clearInterval", "clearTimeout", "confirm", "console", "crypto", "document",
    "fetch", "getComputedStyle", "history", "localStorage", "location", "matchMedia", "navigator",
    "performance", "requestAnimationFrame", "sessionStorage", "setInterval", "setTimeout", "window"
  ].map((name) => [name, "readonly"])
);

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    plugins: { react, "react-hooks": reactHooks },
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error"
    }
  }
];
