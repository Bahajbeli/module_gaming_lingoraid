const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../src/components/Login.js');
let s = fs.readFileSync(p, 'utf8');

const wrongClose =
  '        </' + 'motion.' + 'div>\n        <p className="mt-6 text-center">';
const rightClose = '        </' + 'div>\n        <p className="mt-6 text-center">';

if (s.includes(wrongClose)) {
  s = s.replace(wrongClose, rightClose);
  fs.writeFileSync(p, s);
  console.log('fixed');
} else {
  console.log('already ok or pattern missing');
}
