module.exports = {
  "comments": false,
  "highlightCode": true,
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": ">0.25%, not dead"
      }
    ],
    "@babel/preset-flow",
    "@babel/preset-react"
  ],
  "plugins": [
    "@babel/plugin-transform-runtime",
    "@babel/plugin-proposal-export-default-from",
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-private-methods",
  ],
  "sourceType": "unambiguous"
};
