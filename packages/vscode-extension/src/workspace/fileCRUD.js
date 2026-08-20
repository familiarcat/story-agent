const fs = require('fs');
const path = require('path');
const { assertLocalWorkspace } = require('./localGuard');

const fileCRUD = {
  create(relPath, content) {
    assertLocalWorkspace();
    const fullPath = path.resolve(process.cwd(), relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
};

module.exports = fileCRUD;
