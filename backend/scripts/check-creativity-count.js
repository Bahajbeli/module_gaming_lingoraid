#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.media.count({ where: { type: 'creativity' } });
    const latest = await prisma.media.findMany({
      where: { type: 'creativity' },
      select: { id: true, title: true, createdAt: true, imageUrl: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log('creativity count =', count);
    console.log('latest 10:');
    for (const r of latest) {
      console.log('-', r.createdAt.toISOString(), r.title, r.imageUrl);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

