const { src, dest } = require('gulp');
const fs = require('fs');

function buildIcons() {
  // Guard: if nodes/ doesn't exist yet, there's nothing to copy.
  if (!fs.existsSync('nodes')) {
    return Promise.resolve();
  }
  return src('nodes/**/*.{png,svg}', { encoding: false, allowEmpty: true }).pipe(
    dest('dist/nodes'),
  );
}

exports['build:icons'] = buildIcons;
