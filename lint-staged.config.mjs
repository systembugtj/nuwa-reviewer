/** @type {import('lint-staged').Configuration} */
export default {
  "*.{js,mjs,cjs,ts,tsx,json,md,yml,yaml,css,html}":
    "prettier --write --ignore-unknown",
};
