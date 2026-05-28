const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../src/components/SiteVitrine.js');
let s = fs.readFileSync(p, 'utf8');

if (s.includes('<footer className="mt-16')) {
  console.log('footer already present');
  process.exit(0);
}

const footer = `
        <footer className="mt-16 pt-8 border-t border-gray-200/80 text-center text-sm text-gray-500 pb-8">
          <p>LingoRaid &copy; {new Date().getFullYear()} — Plateforme de jeux pour apprendre l&apos;allemand</p>
          <Link to="/login" className="inline-block mt-2 text-blue-600 hover:text-purple-600 font-medium">
            Se connecter
          </Link>
        </footer>`;

s = s.replace(
  '        </motion.div>\n      </motion.div>\n    </motion.div>\n  );\n};\n\nexport default SiteVitrine;',
  `        </motion.div>${footer}\n      </motion.div>\n    </motion.div>\n  );\n};\n\nexport default SiteVitrine;`
);

// actual file ends with motion.div / div / div
s = fs.readFileSync(p, 'utf8');
if (!s.includes('<footer')) {
  s = s.replace(
    '        </motion.div>\n      </motion.div>\n    </motion.div>\n  );',
    `        </motion.div>${footer}\n      </motion.div>\n    </motion.div>\n  );`
  );
}

if (!s.includes('<footer')) {
  s = s.replace(
    '        </motion.div>\n      </div>\n    </div>\n  );',
    `        </motion.div>${footer}\n      </motion.div>\n    </motion.div>\n  );`.replace('</motion.div>\n    </motion.div>', '</div>\n    </motion.div>')
  );
}

if (!s.includes('<footer')) {
  s = s.replace(
    '        </motion.div>\n      </div>\n    </div>\n  );',
    `        </motion.div>${footer}\n      </div>\n    </div>\n  );`
  );
}

fs.writeFileSync(p, s);
console.log('footer added:', s.includes('<footer'));
