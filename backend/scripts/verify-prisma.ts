import "dotenv/config";
import { prisma } from "../lib/prisma.ts";

async function main() {
  await prisma.organization.findFirst({ take: 1 });
  console.log("✅ Connected.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
