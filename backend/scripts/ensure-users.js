require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const { ensureDemoUsers } = require('../lib/ensureDemoUsers');

const prisma = new PrismaClient();

ensureDemoUsers(prisma)
  .then(() => console.log('✅ Comptes démo OK'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
