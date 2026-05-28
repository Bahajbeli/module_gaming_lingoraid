const fs = require('fs');
const path = require('path');

// Login: fix last invalid tag
const loginPath = path.join(__dirname, '../src/components/Login.js');
let login = fs.readFileSync(loginPath, 'utf8');
login = login.replace('</motionFallback>', '</div>');
fs.writeFileSync(loginPath, login);

// SiteVitrine: add footer
const vitrinePath = path.join(__dirname, '../src/components/SiteVitrine.js');
let vitrine = fs.readFileSync(vitrinePath, 'utf8');

if (!vitrine.includes('<footer')) {
  const footer = [
    '',
    '        <footer className="mt-16 pt-8 border-t border-gray-200/80 text-center text-sm text-gray-500 pb-8">',
    '          <p>LingoRaid &copy; {new Date().getFullYear()} — Plateforme de jeux pour apprendre l&apos;allemand</p>',
    '          <Link to="/login" className="inline-block mt-2 text-blue-600 hover:text-purple-600 font-medium">',
    '            Se connecter',
    '          </Link>',
    '        </footer>',
  ].join('\r\n');

  vitrine = vitrine.replace(
    '        </motion.div>\r\n      </motion.div>\r\n    </motion.div>\r\n  );',
    `        </motion.div>${footer}\r\n      </motion.div>\r\n    </motion.div>\r\n  );`
  );

  if (!vitrine.includes('<footer')) {
    vitrine = vitrine.replace(
      '        </motion.div>\n      </div>\n    </motion.div>\n  );',
      `        </motion.div>${footer.replace(/\r\n/g, '\n')}\n      </motion.div>\n    </motion.div>\n  );`.replace(
        '</motion.div>\n    </motion.div>',
        '</div>\n    </div>'
      )
    );
  }

  if (!vitrine.includes('<footer')) {
    vitrine = vitrine.replace(
      '        </motion.div>\r\n      </motion.div>\r\n    </motion.div>\r\n  );',
      `        </motion.div>${footer}\r\n      </motion.div>\r\n    </motion.div>\r\n  );`
    );
  }

  // actual endings from file
  if (!vitrine.includes('<footer')) {
    const needle = '        </motion.div>\r\n      </motion.div>\r\n    </motion.div>\r\n  );';
    const alt = '        </motion.div>\r\n      </div>\r\n    </div>\r\n  );';
    if (vitrine.includes(alt)) {
      vitrine = vitrine.replace(
        alt,
        `        </motion.div>${footer}\r\n      </motion.div>\r\n    </motion.div>\r\n  );`.replace(
          '</motion.div>\r\n    </motion.div>',
          '</div>\r\n    </div>'
        )
      );
    }
  }

  if (!vitrine.includes('<footer')) {
    vitrine = vitrine.replace(
      '        </motion.div>\r\n      </div>\r\n    </div>\r\n  );',
      `        </motion.div>${footer}\r\n      </motion.div>\r\n    </motion.div>\r\n  );`.replace(
        '</motion.div>\r\n    </motion.div>',
        '</div>\r\n    </div>'
      )
    );
  }

  fs.writeFileSync(vitrinePath, vitrine);
}

console.log('login clean:', !fs.readFileSync(loginPath, 'utf8').includes('motionFallback'));
console.log('footer:', fs.readFileSync(vitrinePath, 'utf8').includes('<footer'));
