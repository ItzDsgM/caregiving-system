const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../node_modules/depd/index.js'),
  path.resolve(__dirname, '../../../node_modules/depd/index.js'),
  path.resolve(__dirname, '../../node_modules/depd/index.js'),
];

for (const depdPath of candidates) {
  if (fs.existsSync(depdPath)) {
    let content = fs.readFileSync(depdPath, 'utf8');
    if (!content.includes('typeof callSite.getFileName')) {
      content = content.replace(
        'function callSiteLocation (callSite) {',
        "function callSiteLocation (callSite) {\n  if (!callSite || typeof callSite.getFileName !== 'function') { return ['<anonymous>', 0, 0]; }",
      );
      fs.writeFileSync(depdPath, content, 'utf8');
    }
  }
}
