require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, passwordHash: true },
  });
  console.log('Total users:', users.length);
  for (const u of users) {
    const expected = u.email.includes('admin') ? 'admin123' : 'user123';
    const ok = u.passwordHash ? await bcrypt.compare(expected, u.passwordHash) : false;
    console.log(JSON.stringify({
      email: u.email,
      role: u.role,
      hashLen: u.passwordHash?.length ?? 0,
      passwordOk: ok,
    }));
  }
  console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
