# 🍁 Maple

[![npm](https://img.shields.io/npm/v/@netwin/maple)](https://www.npmjs.com/package/@netwin/maple)
[![CI](https://github.com/NetWin/maple/actions/workflows/push.yml/badge.svg?branch=master)](https://github.com/NetWin/maple/actions/workflows/push.yml)
[![license](https://img.shields.io/npm/l/@netwin/maple)](LICENSE)
[![node](https://img.shields.io/node/v/@netwin/maple)](https://www.npmjs.com/package/@netwin/maple)

Maple is a secure JavaScript interpreter written in TypeScript.
It interprets a script itself instead of handing it to `eval`, so the script only ever sees the values you pass in.
Try it in the [playground](https://netwin.github.io/maple/), which runs Maple in your browser.

Installation, usage and the API are in the [library's README](packages/maple/README.md), and the full contract is in its [docs](packages/maple/docs/README.md).

## Repository layout

This is a pnpm workspace:

| Path                    | Package                                             | Description                                                                                                                                                         |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/maple`        | [`@netwin/maple`](packages/maple)                   | The published library (ESM, Node >= 22, peer dep: `acorn`)                                                                                                          |
| `apps/maple-playground` | [`@netwin/maple-playground`](apps/maple-playground) | Private Angular app for trying out the interpreter                                                                                                                  |
| `packages/maple-parity` | [`@netwin/maple-parity`](packages/maple-parity)     | Private parity tests: Maple adheres to JS standards and (for internal reasons) documents the parity with [JS-Interpreter](https://github.com/NetWin/js-interpreter) |

## Contributing

Setup, scripts, commit conventions and releases are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © NetWin
