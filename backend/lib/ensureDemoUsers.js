const bcrypt = require('bcryptjs');

const DEMO_USERS = [
  { email: 'admin@deutsche-lernen.com', password: 'admin123', role: 'ADMIN' },
  { email: 'user@deutsche-lernen.com', password: 'user123', role: 'USER' },
];

/**
 * Crée ou répare les comptes de démonstration (hash mot de passe + rôle).
 */
async function ensureDemoUsers(prisma) {
  for (const { email, password, role } of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      await prisma.user.create({
        data: { email, passwordHash, role },
      });
      console.log(`👤 Compte créé: ${email} / ${password}`);
      continue;
    }

    const passwordOk =
      existing.passwordHash &&
      (await bcrypt.compare(password, existing.passwordHash));

    if (!passwordOk || existing.role !== role) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash, role },
      });
      console.log(`🔧 Compte réparé: ${email} / ${password}`);
    }
  }
}

module.exports = { ensureDemoUsers, DEMO_USERS };
