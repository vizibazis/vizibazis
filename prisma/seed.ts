import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.worker.count();
  if (existing > 0) {
    console.log("Workers already seeded.");
    return;
  }
  for (let i = 1; i <= 10; i++) {
    await prisma.worker.create({ data: { name: `Szerelő${i}` } });
  }
  console.log("Seeded 10 workers.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
