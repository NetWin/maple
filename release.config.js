// The changelog preview on pull requests sets RELEASE_PREVIEW. It only needs the next version and its
// notes, and the plugins that prepare and publish a release would check npm and git credentials it
// neither has nor needs. Anything else is a real release, so a broken check fails the preview loudly
// instead of releasing without publishing.
const preview = process.env.RELEASE_PREVIEW === 'true';

const publish = [
  ['@semantic-release/changelog', { changelogFile: 'packages/maple/CHANGELOG.md' }],
  ['@semantic-release/npm', { pkgRoot: 'packages/maple', npmPublish: true }],
  [
    '@semantic-release/git',
    {
      assets: ['packages/maple/package.json', 'packages/maple/CHANGELOG.md'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }
  ],
  '@semantic-release/github'
];

export default {
  branches: ['master'],
  // Plain versions (1.2.3), without the default "v" prefix
  tagFormat: '${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // While Maple is on 0.x, a breaking change bumps the minor version
          { breaking: true, release: 'minor' },
          // Dependency updates and refactorings change what ships, so they release a patch
          { type: 'build', scope: 'deps', release: 'patch' },
          { type: 'refactor', release: 'patch' }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '🚀 Features' },
            { type: 'fix', section: '🩹 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance Improvements' },
            { type: 'revert', section: '↩️ Reverts' },
            { type: 'docs', section: '📖 Documentation' },
            { type: 'style', section: '🎨 Code Style' },
            { type: 'chore', section: '🔧 Miscellaneous Chores' },
            { type: 'refactor', section: '🛠️ Code Refactoring' },
            { type: 'test', section: '🧪 Tests' },
            { type: 'build', scope: 'deps', section: '🏗 Dependency Updates' },
            { type: 'build', section: '📦 Build System' },
            { type: 'ci', section: '🔄️ Continuous Integration' }
          ]
        }
      }
    ],
    ...(preview ? [] : publish)
  ]
};
