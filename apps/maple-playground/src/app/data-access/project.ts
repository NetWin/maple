import { version } from '../../../../../packages/maple/package.json';

/** The version of the library the playground runs, read from its package.json at build time. */
export const MAPLE_VERSION = version;

/** Where Maple lives, for the header and the welcome dialog. */
export const PROJECT_LINKS = {
  github: 'https://github.com/NetWin/maple',
  npm: 'https://www.npmjs.com/package/@netwin/maple',
  docs: 'https://github.com/NetWin/maple/blob/master/packages/maple/docs/README.md'
} as const;
