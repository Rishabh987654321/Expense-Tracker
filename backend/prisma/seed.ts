import "dotenv/config";
import bcrypt from "bcrypt";
import { createPrismaClient } from "../lib/prisma.ts";

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL (or MIGRATE_DATABASE_URL) must be set");
}

const prisma = createPrismaClient(url);

const PW = "password123";

const orgs = [
  {
    slug: "acme",
    name: "Acme Corp",
    members: [
      { name: "Alice Admin", email: "alice@acme.test", role: "ADMIN" as const },
      { name: "Mark Manager", email: "mark@acme.test", role: "MANAGER" as const },
      { name: "Eve Employee", email: "eve@acme.test", role: "EMPLOYEE" as const },
    ],
  },
  {
    slug: "globex",
    name: "Globex Inc",
    members: [
      { name: "Greg Admin", email: "greg@globex.test", role: "ADMIN" as const },
      { name: "Mia Manager", email: "mia@globex.test", role: "MANAGER" as const },
      { name: "Ed Employee", email: "ed@globex.test", role: "EMPLOYEE" as const },
    ],
  },
];

const categories = ["TRAVEL", "MEALS", "SOFTWARE", "OFFICE", "OTHER"] as const;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  const passwordHash = await bcrypt.hash(PW, 10);

  for (const o of orgs) {
    console.log(`[seed] org ${o.slug}`);
    const org = await prisma.organization.upsert({
      where: { slug: o.slug },
      create: { slug: o.slug, name: o.name },
      update: { name: o.name },
    });

    const memberRows = [];
    for (const m of o.members) {
      const u = await prisma.user.upsert({
        where: { orgId_email: { orgId: org.id, email: m.email } },
        create: { orgId: org.id, email: m.email, name: m.name, role: m.role, passwordHash },
        update: { name: m.name, role: m.role },
      });
      memberRows.push(u);
    }

    const employee = memberRows.find((m) => m.role === "EMPLOYEE");
    const manager = memberRows.find((m) => m.role === "MANAGER");
    if (!employee || !manager) continue;

    const existing = await prisma.expense.count({ where: { orgId: org.id } });
    if (existing < 18) {
      for (let i = 0; i < 18; i++) {
        const monthsAgo = Math.floor(i / 3);
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);
        date.setDate(1 + (i % 25));

        const status = rand(statuses);
        const expense = await prisma.expense.create({
          data: {
            orgId: org.id,
            submitterId: employee.id,
            amountCents: Math.floor(Math.random() * 80000) + 2000,
            currency: "USD",
            category: rand(categories),
            description: `${rand(categories)} expense #${i + 1}`,
            expenseDate: date,
            status,
          },
        });

        if (status !== "PENDING") {
          await prisma.approval.create({
            data: {
              orgId: org.id,
              expenseId: expense.id,
              approverId: manager.id,
              decision: status,
              note: status === "REJECTED" ? "Out of policy." : null,
            },
          });
        }
      }
    }
  }

  await prisma.starterNotebook.create({
    data: {
      title: "Seed notebook",
      pages: {
        create: [{ body: "Hello from prisma db seed." }],
      },
    },
  });

  console.log("\n[seed] done.");
  console.log('Demo logins (password = "password123"):');
  for (const o of orgs) {
    for (const m of o.members) {
      console.log(`  http://${o.slug}.localhost:5173 -> ${m.email} (${m.role})`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
