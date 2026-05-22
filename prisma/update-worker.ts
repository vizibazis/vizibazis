import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.worker.updateMany({
    where: { name: "Szerelő1" },
    data: { name: "Dobos Tamás", email: "dobos.tamas@nemos.eu" },
  });
  console.log(`Updated ${updated.count} worker(s).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
