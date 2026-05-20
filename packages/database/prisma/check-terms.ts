import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const terms = await prisma.academicTerm.findMany({});
  console.log('--- ALL TERMS IN DATABASE ---');
  console.log(JSON.stringify(terms, null, 2));
  await prisma.$disconnect();
}

main();
