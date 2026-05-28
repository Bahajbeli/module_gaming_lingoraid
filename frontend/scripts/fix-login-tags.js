const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../src/components/Login.js');
let s = fs.readFileSync(p, 'utf8');

const bad1 = '        </motionFallback>\n        <p className="mt-6 text-center">';
const good1 = '        </motion.div>\n        <p className="mt-6 text-center">';

const bad2 = '    </motionFallback>\n  );';
const good2 = '    </motion.div>\n  );';

if (s.includes(bad1)) s = s.replace(bad1, good1);
else if (s.includes('        </motionFallback>\n        <p')) s = s.replace('        </motionFallback>\n        <p', '        </motion.div>\n        <p');

if (s.includes(bad2)) s = s.replace(bad2, good2);
else if (s.includes('    </motionFallback>')) s = s.replace('    </motionFallback>', '    </motion.div>');

fs.writeFileSync(p, s);
console.log('motionFallback left:', s.includes('motionFallback'));
