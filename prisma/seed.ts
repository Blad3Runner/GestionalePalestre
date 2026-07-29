import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.ts";

/**
 * Demo accounts, so the five roles can actually be tried.
 *
 * These are development fixtures, not real people. The password is the same for all of
 * them and is printed below on purpose — it protects nothing. Running this again just
 * refreshes them; it never touches anybody else.
 */

const DEMO_PASSWORD = "Palestra2026!";

const PEOPLE = [
  {
    email: "admin@example.com",
    name: "Ada Fondatrice",
    roles: ["PLATFORM_ADMIN"] as const,
    language: "IT" as const,
    description: "platform admin — sees the platform administration area",
  },
  {
    email: "titolare@example.com",
    name: "Matteo Titolare",
    roles: ["GYM_OWNER", "TRAINER"] as const,
    language: "IT" as const,
    description: "gym owner AND trainer — proves one person can hold two roles",
  },
  {
    email: "reception@example.com",
    name: "Sara Reception",
    roles: ["STAFF"] as const,
    language: "IT" as const,
    description: "front desk — front desk area only",
  },
  {
    email: "trainer@example.com",
    name: "Luca Trainer",
    roles: ["TRAINER"] as const,
    language: "EN" as const,
    description: "trainer, set to English — proves the language follows the account",
  },
  {
    email: "cliente@example.com",
    name: "Giulia Cliente",
    roles: ["MEMBER"] as const,
    language: "IT" as const,
    description: "member — personal area only",
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  for (const person of PEOPLE) {
    const record = await prisma.person.upsert({
      where: { email: person.email },
      update: { name: person.name, passwordHash, language: person.language },
      create: {
        email: person.email,
        name: person.name,
        passwordHash,
        language: person.language,
      },
    });

    // Replace the roles outright, so editing this file is always reflected.
    await prisma.personRole.deleteMany({ where: { personId: record.id } });
    await prisma.personRole.createMany({
      data: person.roles.map((role) => ({ personId: record.id, role })),
    });

    console.log(`  ${person.email.padEnd(24)} ${person.description}`);
  }

  console.log("");
  console.log(`  Password for all of them: ${DEMO_PASSWORD}`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
