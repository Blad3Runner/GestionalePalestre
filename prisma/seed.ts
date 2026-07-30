import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.ts";

/**
 * Demo data, so the walls between companies can actually be tried.
 *
 * Runs with the **privileged** account, because seeding is a setup operation like a
 * migration — the restricted account the application uses could not see past its own
 * badge to write this.
 *
 * These are development fixtures, not real people. The password is the same for all of
 * them and printed below on purpose: it protects nothing.
 *
 * The shape is chosen to make the five wall tests meaningful:
 *
 *   Studio Seregno   one gym    the founding tenant
 *   Circuito Nord    two gyms   a circuit, so a gym-level owner has a sibling to not see
 */

const DEMO_PASSWORD = "Palestra2026!";

async function main() {
  const connectionString =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const seregno = await prisma.company.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: { name: "Studio Seregno" },
    create: { id: "11111111-1111-1111-1111-111111111111", name: "Studio Seregno" },
  });

  const nord = await prisma.company.upsert({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    update: { name: "Circuito Nord" },
    create: { id: "22222222-2222-2222-2222-222222222222", name: "Circuito Nord" },
  });

  const gyms = [
    { id: "aaaaaaaa-0000-0000-0000-000000000001", companyId: seregno.id, name: "Seregno", city: "Seregno" },
    { id: "bbbbbbbb-0000-0000-0000-000000000001", companyId: nord.id, name: "Monza", city: "Monza" },
    { id: "bbbbbbbb-0000-0000-0000-000000000002", companyId: nord.id, name: "Como", city: "Como" },
  ];

  for (const gym of gyms) {
    await prisma.gym.upsert({
      where: { id: gym.id },
      update: { name: gym.name, city: gym.city, companyId: gym.companyId },
      create: gym,
    });
  }

  const [seregnoGym, monza, como] = gyms;

  const people = [
    {
      email: "admin@example.com",
      name: "Ada Fondatrice",
      language: "IT" as const,
      platformRoles: ["PLATFORM_ADMIN"] as const,
      memberships: [] as { companyId: string; gymId: string | null; role: string }[],
      description: "platform admin — sees every company",
    },
    {
      email: "titolare@example.com",
      name: "Matteo Titolare",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [
        { companyId: seregno.id, gymId: null, role: "GYM_OWNER" },
        { companyId: seregno.id, gymId: seregnoGym.id, role: "TRAINER" },
      ],
      description: "owner AND trainer at Studio Seregno — one person, two roles",
    },
    {
      email: "reception@example.com",
      name: "Sara Reception",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [{ companyId: seregno.id, gymId: seregnoGym.id, role: "STAFF" }],
      description: "front desk at Seregno",
    },
    {
      email: "trainer@example.com",
      name: "Luca Trainer",
      language: "EN" as const,
      platformRoles: [] as const,
      memberships: [{ companyId: seregno.id, gymId: seregnoGym.id, role: "TRAINER" }],
      description: "trainer at Seregno, in English",
    },
    {
      email: "cliente@example.com",
      name: "Giulia Cliente",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [
        {
          companyId: seregno.id,
          gymId: seregnoGym.id,
          role: "MEMBER",
          lifecycleState: "CLIENT" as const,
          level: "Intermedio",
          packageCap: 3,
        },
      ],
      description: "member at Seregno, already a Client",
    },
    {
      email: "cliente2@example.com",
      name: "Paolo Cliente",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [
        {
          companyId: seregno.id,
          gymId: seregnoGym.id,
          role: "MEMBER",
          lifecycleState: "LEAD" as const,
        },
      ],
      description: "a SECOND member at the same gym, still a Lead — wall test (c)",
    },
    {
      email: "duecappelli@example.com",
      name: "Elena Due Cappelli",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [
        { companyId: seregno.id, gymId: seregnoGym.id, role: "TRAINER" },
        {
          companyId: nord.id,
          gymId: monza.id,
          role: "MEMBER",
          lifecycleState: "CLIENT" as const,
        },
      ],
      description:
        "TRAINER at Studio Seregno and a MEMBER at Circuito Nord — one person, two companies",
    },
    {
      email: "nord@example.com",
      name: "Nadia Nord",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [{ companyId: nord.id, gymId: null, role: "GYM_OWNER" }],
      description: "owner of the whole Circuito Nord — sees both Monza and Como",
    },
    {
      email: "monza@example.com",
      name: "Marco Monza",
      language: "IT" as const,
      platformRoles: [] as const,
      memberships: [{ companyId: nord.id, gymId: monza.id, role: "GYM_OWNER" }],
      description: "owner of Monza ONLY — must not see Como. Wall test (b)",
    },
  ];

  for (const person of people) {
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

    // Replace outright, so editing this file is always reflected.
    await prisma.personRole.deleteMany({ where: { personId: record.id } });
    if (person.platformRoles.length > 0) {
      await prisma.personRole.createMany({
        data: person.platformRoles.map((role) => ({ personId: record.id, role })),
      });
    }

    await prisma.membership.deleteMany({ where: { personId: record.id } });
    for (const membership of person.memberships) {
      const shape = membership as typeof membership & {
        lifecycleState?: "LEAD" | "STARTER" | "CLIENT" | "DORMANT" | "CHURN";
        level?: string;
        packageCap?: number;
      };

      const created = await prisma.membership.create({
        data: {
          personId: record.id,
          companyId: membership.companyId,
          gymId: membership.gymId,
          role: membership.role as "GYM_OWNER" | "STAFF" | "TRAINER" | "MEMBER",
          lifecycleState: shape.lifecycleState ?? null,
          level: shape.level ?? null,
          packageCap: shape.packageCap ?? null,
        },
      });

      // Every member starts with the history that explains their state.
      if (shape.lifecycleState) {
        await prisma.lifecycleEvent.create({
          data: {
            membershipId: created.id,
            companyId: membership.companyId,
            gymId: membership.gymId,
            fromState: null,
            toState: shape.lifecycleState,
            note: "Seeded",
          },
        });
      }

      // Seniority changes what a trainer earns, never what a client pays.
      if (membership.role === "TRAINER") {
        await prisma.trainerCompensation.create({
          data: {
            membershipId: created.id,
            companyId: membership.companyId,
            gymId: membership.gymId,
            model: person.email === "titolare@example.com" ? "OWNER_DRAW" : "PER_SESSION",
            amount: person.email === "titolare@example.com" ? null : "25.00",
          },
        });
      }
    }

    console.log(`  ${person.email.padEnd(24)} ${person.description}`);
  }

  // Give the Seregno members a usual trainer, so deactivation has something to release.
  const lucaTrainer = await prisma.membership.findFirst({
    where: { role: "TRAINER", person: { email: "trainer@example.com" } },
  });
  if (lucaTrainer) {
    await prisma.membership.updateMany({
      where: { role: "MEMBER", gymId: seregnoGym.id },
      data: { defaultTrainerId: lucaTrainer.id },
    });
  }

  console.log("");
  console.log(`  Studio Seregno   1 gym  (${seregnoGym.name})`);
  console.log(`  Circuito Nord    2 gyms (${monza.name}, ${como.name})`);
  console.log("");
  console.log(`  Password for all of them: ${DEMO_PASSWORD}`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
