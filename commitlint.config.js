export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [0, 'always', 140],
    // Every commit names what it changes, `*` when it spans the repository
    'scope-empty': [2, 'never']
  }
};
