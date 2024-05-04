module.exports = {
  "plugins": [
    "p5js"
  ],
  "env": {
    "browser": true,
    "node": true,
    "es2021": true,
    "p5js/p5": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:p5js/p5"
  ],
  "overrides": [
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "never"
    ],
    "camelcase": "error"
  }
}
