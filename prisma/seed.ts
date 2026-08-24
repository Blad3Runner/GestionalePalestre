import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.ts";

/**
 * ===========================================================================
 * THE DEMO WORLD
 * ===========================================================================
 *
 * Every account below has the SAME password:
 *
 *     Palestra2026!
 *
 * THE STRUCTURE
 * ---------------------------------------------------------------------------
 * A COMPANY is the tenant — the business, the thing with the walls around it.
 * A GYM is one physical location belonging to exactly one company.
 * A company may own one gym or several. Company names never contain a city;
 * gym names are ONLY cities, so the two can never be confused.
 *
 *   Studio Corpo Libero    ONE gym:  Milano                    sells CREDITS
 *                          (the founding tenant)
 *
 *   Circuito Nord          TWO gyms: Bologna, Torino           sells SUBSCRIPTIONS
 *
 * ---------------------------------------------------------------------------
 * SIGN IN AS                      WHAT THEY ARE            WHERE
 * ---------------------------------------------------------------------------
 * admin@example.com               PLATFORM ADMIN           everywhere
 *
 * -- Studio Corpo Libero --------------------------------------------------
 * titolare@example.com            owner AND trainer        whole company
 * reception@example.com           front desk               Milano
 * trainer@example.com             trainer   (ACTIVE)       Milano
 * senior@example.com              trainer   (DEACTIVATED)  Milano
 * cliente@example.com             member - Client          Milano
 * cliente2@example.com            member - Lead            Milano
 * starter@example.com             member - Starter         Milano
 * dormiente@example.com           member - Dormant         Milano
 * perso@example.com               member - Churn           Milano
 *
 * -- Circuito Nord ---------------------------------------------------------
 * nord@example.com                owner                    WHOLE circuit
 * bologna@example.com             owner                    BOLOGNA ONLY
 * reception.bologna@example.com   front desk               Bologna
 * trainer.bologna@example.com     trainer   (ACTIVE)       Bologna
 * trainer.torino@example.com      trainer   (DEACTIVATED)  Torino
 * bologna.lead@example.com        member - Lead            Bologna
 * torino.cliente@example.com      member - Client          Torino
 *
 * -- The awkward one -------------------------------------------------------
 * duecappelli@example.com         TRAINER at Studio Corpo Libero
 *                                 AND a MEMBER at Circuito Nord (Bologna)
 * ---------------------------------------------------------------------------
 *
 * These are development fixtures, not real people. The password is shared and
 * printed on purpose: it protects nothing.
 *
 * Runs with the **privileged** account, because seeding is a setup operation like a
 * migration — the restricted account the application uses could not see past its own
 * badge to write this.
 *
 * To wipe everything and start again: `npm run db:reset-demo`.
 */

export const DEMO_PASSWORD = "Palestra2026!";

/** Fixed identifiers, because the wall tests name some of them directly. */
export const IDS = {
  corpoLibero: "11111111-1111-1111-1111-111111111111",
  nord: "22222222-2222-2222-2222-222222222222",
  milano: "aaaaaaaa-0000-0000-0000-000000000001",
  bologna: "bbbbbbbb-0000-0000-0000-000000000001",
  torino: "bbbbbbbb-0000-0000-0000-000000000002",
} as const;

type Lifecycle = "LEAD" | "STARTER" | "CLIENT" | "DORMANT" | "CHURN";
type SeedRole = "GYM_OWNER" | "STAFF" | "TRAINER" | "MEMBER";

type SeedMembership = {
  companyId: string;
  /** Null means the role covers the whole circuit. */
  gymId: string | null;
  role: SeedRole;
  lifecycleState?: Lifecycle;
  level?: string;
  packageCap?: number;
  /** Trainers only. A deactivated trainer keeps every row they ever had. */
  isActive?: boolean;
  /** Trainers only. Seniority changes what a trainer EARNS, never what a client pays. */
  compensation?: { model: "PER_SESSION" | "REVENUE_SHARE" | "OWNER_DRAW"; amount: string | null };
};

type SeedPerson = {
  email: string;
  name: string;
  language: "IT" | "EN";
  platformRoles: readonly "PLATFORM_ADMIN"[];
  memberships: SeedMembership[];
  description: string;
};

const PEOPLE: SeedPerson[] = [
  {
    email: "admin@example.com",
    name: "Ada Fondatrice",
    language: "IT",
    platformRoles: ["PLATFORM_ADMIN"],
    memberships: [],
    description: "PLATFORM ADMIN — sees every company. The owner's own account",
  },

  // --- Studio Corpo Libero: one gym, credits, the founding tenant ---------------

  {
    email: "titolare@example.com",
    name: "Matteo Titolare",
    language: "IT",
    platformRoles: [],
    memberships: [
      { companyId: IDS.corpoLibero, gymId: null, role: "GYM_OWNER" },
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "TRAINER",
        compensation: { model: "OWNER_DRAW", amount: null },
      },
    ],
    description: "owner AND trainer at Studio Corpo Libero — one person, two roles",
  },
  {
    email: "reception@example.com",
    name: "Sara Reception",
    language: "IT",
    platformRoles: [],
    memberships: [{ companyId: IDS.corpoLibero, gymId: IDS.milano, role: "STAFF" }],
    description: "front desk at Milano — adds members, cannot see money",
  },
  {
    email: "trainer@example.com",
    name: "Luca Trainer",
    language: "EN",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "TRAINER",
        compensation: { model: "PER_SESSION", amount: "25.00" },
      },
    ],
    description: "ACTIVE trainer at Milano, junior (per session), app in English",
  },
  {
    email: "senior@example.com",
    name: "Chiara Senior",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "TRAINER",
        isActive: false,
        compensation: { model: "REVENUE_SHARE", amount: "45.00" },
      },
    ],
    description: "DEACTIVATED trainer at Milano, senior (revenue share) — history kept",
  },
  {
    email: "cliente@example.com",
    name: "Giulia Cliente",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "MEMBER",
        lifecycleState: "CLIENT",
        level: "Intermedio",
        packageCap: 3,
      },
    ],
    description: "member at Milano — CLIENT, level Intermedio, package up to 3",
  },
  {
    email: "cliente2@example.com",
    name: "Paolo Cliente",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "MEMBER",
        lifecycleState: "LEAD",
      },
    ],
    description: "member at Milano — LEAD. Wall test (c) uses this one",
  },
  {
    email: "starter@example.com",
    name: "Sofia Starter",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "MEMBER",
        lifecycleState: "STARTER",
        level: "Base",
      },
    ],
    description: "member at Milano — STARTER (bought the entry pack)",
  },
  {
    email: "dormiente@example.com",
    name: "Davide Dormiente",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "MEMBER",
        lifecycleState: "DORMANT",
        level: "Intermedio",
      },
    ],
    description: "member at Milano — DORMANT (stopped coming)",
  },
  {
    email: "perso@example.com",
    name: "Piero Perso",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "MEMBER",
        lifecycleState: "CHURN",
      },
    ],
    description: "member at Milano — CHURN (gone)",
  },

  // --- Circuito Nord: two gyms, subscriptions ------------------------------

  {
    email: "nord@example.com",
    name: "Nadia Nord",
    language: "IT",
    platformRoles: [],
    memberships: [{ companyId: IDS.nord, gymId: null, role: "GYM_OWNER" }],
    description: "owner of the WHOLE Circuito Nord — sees both Bologna and Torino",
  },
  {
    email: "bologna@example.com",
    name: "Marco Bologna",
    language: "IT",
    platformRoles: [],
    memberships: [{ companyId: IDS.nord, gymId: IDS.bologna, role: "GYM_OWNER" }],
    description: "owner of BOLOGNA ONLY — must not see Torino. Wall test (b)",
  },
  {
    email: "reception.bologna@example.com",
    name: "Rita Reception",
    language: "IT",
    platformRoles: [],
    memberships: [{ companyId: IDS.nord, gymId: IDS.bologna, role: "STAFF" }],
    description: "front desk at Bologna",
  },
  {
    email: "trainer.bologna@example.com",
    name: "Nico Trainer",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.nord,
        gymId: IDS.bologna,
        role: "TRAINER",
        compensation: { model: "PER_SESSION", amount: "22.00" },
      },
    ],
    description: "ACTIVE trainer at Bologna, junior (per session)",
  },
  {
    email: "trainer.torino@example.com",
    name: "Carla Torino",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.nord,
        gymId: IDS.torino,
        role: "TRAINER",
        isActive: false,
        compensation: { model: "REVENUE_SHARE", amount: "40.00" },
      },
    ],
    description: "DEACTIVATED trainer at Torino, senior (revenue share)",
  },
  {
    email: "bologna.lead@example.com",
    name: "Nadir Lead",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.nord,
        gymId: IDS.bologna,
        role: "MEMBER",
        lifecycleState: "LEAD",
      },
    ],
    description: "member at Bologna — LEAD",
  },
  {
    email: "torino.cliente@example.com",
    name: "Carlo Torino",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.nord,
        gymId: IDS.torino,
        role: "MEMBER",
        lifecycleState: "CLIENT",
        level: "Avanzato",
      },
    ],
    description: "member at Torino — CLIENT. Invisible to the Bologna-only owner",
  },

  // --- The awkward one -----------------------------------------------------

  {
    email: "duecappelli@example.com",
    name: "Elena Due Cappelli",
    language: "IT",
    platformRoles: [],
    memberships: [
      {
        companyId: IDS.corpoLibero,
        gymId: IDS.milano,
        role: "TRAINER",
        compensation: { model: "PER_SESSION", amount: "28.00" },
      },
      {
        companyId: IDS.nord,
        gymId: IDS.bologna,
        role: "MEMBER",
        lifecycleState: "CLIENT",
        level: "Avanzato",
      },
    ],
    description: "TWO HATS — trainer at Studio Corpo Libero, member at Circuito Nord",
  },
];

/**
 * Builds the demo world. Safe to run repeatedly: memberships and platform roles are
 * replaced outright, so editing this file is always reflected.
 *
 * **`db:reset-demo` is the one that wipes first.** This one leaves anything the owner
 * created by hand where it is.
 */
export async function seedDemoWorld(
  prisma: InstanceType<typeof PrismaClient>,
): Promise<void> {
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  // The business model is a LABEL here, not behaviour. Neither module exists yet —
  // credits arrive in Step 6, subscriptions are deferred. It is recorded so the sandbox
  // has the two shapes the owner asked for (docs/decisions.md, 2026-08-22).
  const companies = [
    {
      id: IDS.corpoLibero,
      name: "Studio Corpo Libero",
      settings: { businessModel: "CREDITS", demo: true },
    },
    {
      id: IDS.nord,
      name: "Circuito Nord",
      settings: { businessModel: "SUBSCRIPTIONS", demo: true },
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: { name: company.name, settings: company.settings },
      create: company,
    });
  }

  const gyms = [
    { id: IDS.milano, companyId: IDS.corpoLibero, name: "Milano", city: "Milano" },
    { id: IDS.bologna, companyId: IDS.nord, name: "Bologna", city: "Bologna" },
    { id: IDS.torino, companyId: IDS.nord, name: "Torino", city: "Torino" },
  ];

  for (const gym of gyms) {
    await prisma.gym.upsert({
      where: { id: gym.id },
      update: { name: gym.name, city: gym.city, companyId: gym.companyId },
      create: gym,
    });
  }

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

    await prisma.personRole.deleteMany({ where: { personId: record.id } });
    if (person.platformRoles.length > 0) {
      await prisma.personRole.createMany({
        data: person.platformRoles.map((role) => ({ personId: record.id, role })),
      });
    }

    await prisma.membership.deleteMany({ where: { personId: record.id } });

    for (const membership of person.memberships) {
      const created = await prisma.membership.create({
        data: {
          personId: record.id,
          companyId: membership.companyId,
          gymId: membership.gymId,
          role: membership.role,
          // `deactivatedAt` is NOT set here: a database trigger derives it from this.
          isActive: membership.isActive ?? true,
          lifecycleState: membership.lifecycleState ?? null,
          level: membership.level ?? null,
          packageCap: membership.packageCap ?? null,
        },
      });

      // Every member starts with the history that explains the state they are in.
      if (membership.lifecycleState) {
        await prisma.lifecycleEvent.create({
          data: {
            membershipId: created.id,
            companyId: membership.companyId,
            gymId: membership.gymId,
            fromState: null,
            toState: membership.lifecycleState,
            note: "Seeded",
          },
        });
      }

      // Seniority lives here, and changes what a trainer earns — never what a client
      // pays. All three models appear in the demo world so none goes untested.
      if (membership.compensation) {
        await prisma.trainerCompensation.create({
          data: {
            membershipId: created.id,
            companyId: membership.companyId,
            gymId: membership.gymId,
            model: membership.compensation.model,
            amount: membership.compensation.amount,
          },
        });
      }
    }
  }

  // Give the active trainers some assigned members, so deactivating one has something
  // real to release — which is the point the acceptance script asks the owner to watch.
  await assignDefaultTrainer(prisma, "trainer@example.com", IDS.milano);
  await assignDefaultTrainer(prisma, "trainer.bologna@example.com", IDS.bologna);
}

async function assignDefaultTrainer(
  prisma: InstanceType<typeof PrismaClient>,
  trainerEmail: string,
  gymId: string,
): Promise<void> {
  const trainer = await prisma.membership.findFirst({
    where: { role: "TRAINER", gymId, person: { email: trainerEmail } },
  });
  if (!trainer) {
    return;
  }
  await prisma.membership.updateMany({
    where: { role: "MEMBER", gymId },
    data: { defaultTrainerId: trainer.id },
  });
}

export function demoConnectionString(): string | undefined {
  return process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
}

export function printAccounts(): void {
  console.log("");
  console.log("  Studio Corpo Libero   1 gym  (Milano)          sells CREDITS");
  console.log("  Circuito Nord    2 gyms (Bologna, Torino)      sells SUBSCRIPTIONS");
  console.log("");
  for (const person of PEOPLE) {
    console.log(`  ${person.email.padEnd(28)} ${person.description}`);
  }
  console.log("");
  console.log(`  Password for every one of them: ${DEMO_PASSWORD}`);
  console.log("");
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: demoConnectionString() }),
  });

  await seedDemoWorld(prisma);
  printAccounts();

  await prisma.$disconnect();
}

// Only run when invoked directly, so `db:reset-demo` can import the pieces above.
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
