const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const roots = ['server.js', 'src'];

function collectJsFiles(target) {
  const files = [];
  const entries = readdirSync(target, { withFileTypes: true });

  entries.forEach((entry) => {
    const fullPath = join(target, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      return;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  });

  return files;
}

const files = roots.flatMap((root) => (root.endsWith('.js') ? [root] : collectJsFiles(root)));
let failed = false;

files.forEach((file) => {
  const result = spawnSync(process.execPath, ['-c', file], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${file}`);
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  }
});

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} files.`);
