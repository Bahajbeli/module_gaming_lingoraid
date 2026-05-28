const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../src/components/SiteVitrine.js');
let s = fs.readFileSync(p, 'utf8');

const cm = '</motion.div>';

s = s.replace(
  /            <\/a>\n          <\/div>\n        <\/div>\n      <\/section>\n\n      <section className="max-w-6xl mx-auto px-4 pb-8">/,
  '            </a>\n          </div>\n        ' + cm + '\n      </section>\n\n      <section className="max-w-6xl mx-auto px-4 pb-8">'
);

s = s.replace(
  /          \)\}\)\n        <\/div>\n      <\/section>\n\n      <section id="jeux"/,
  '          ))}\n        ' + cm + '\n      </section>\n\n      <section id="jeux"'
);

s = s.replace(
  /<p className="text-xs text-slate-400 mt-1">\{f\.desc\}<\/p>\n            <\/div>\n          \)\}\)\n        <\/div>/,
  '<p className="text-xs text-slate-400 mt-1">{f.desc}</p>\n            ' + cm + '\n          ))}\n        ' + cm
);

s = s.replace(
  /<ChevronRight className="h-5 w-5" \/>\n          <\/Link>\n        <\/div>\n      <\/section>\n    <\/main>/,
  '<ChevronRight className="h-5 w-5" />\n          </Link>\n        ' + cm + '\n      </section>\n    </main>'
);

fs.writeFileSync(p, s);
console.log('ok');
