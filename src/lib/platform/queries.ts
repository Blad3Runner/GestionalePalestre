import { withBadge } from "@/lib/db";
import type { Viewer } from "@/lib/tenancy/active-scope";

/**
 * What the founders see across every company.
 *
 * These queries travel with a PLATFORM badge, which is the only badge the Row-Level
 * Security policies let past the company walls. Everything here is therefore visible to
 * platform admins and to nobody else — not because this code filters, but because the
 * database refuses anyone else.
 */

export type CompanyRow = {
  id: string;
  name: string;
  fiscalId: string | null;
  businessModel: string | null;
  isActive: boolean;
  gyms: { id: string; name: string; city: string | null; isActive: boolean }[];
  people: number;
};

export async function listCompanies(viewer: Viewer): Promise<CompanyRow[]> {
  return withBadge(viewer.badge, async (tx) => {
    const companies = await tx.company.findMany({
      include: {
        gyms: { orderBy: { name: "asc" } },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: "asc" },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      fiscalId: company.fiscalId,
      businessModel: readBusinessModel(company.settings),
      isActive: company.isActive,
      gyms: company.gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        city: gym.city,
        isActive: gym.isActive,
      })),
      people: company._count.memberships,
    }));
  });
}

/**
 * The business model is a LABEL in company settings, not behaviour — neither module
 * exists yet (docs/decisions.md, 2026-08-22). Read defensively: settings is free-form
 * JSON, and anything may be in there.
 */
function readBusinessModel(settings: unknown): string | null {
  if (typeof settings !== "object" || settings === null) {
    return null;
  }
  const value = (settings as Record<string, unknown>).businessModel;
  return typeof value === "string" ? value : null;
}

export type PersonRow = {
  personId: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  places: {
    membershipId: string;
    companyName: string;
    gymName: string | null;
    role: string;
    isActive: boolean;
    lifecycleState: string | null;
  }[];
};

export async function listPeople(viewer: Viewer): Promise<PersonRow[]> {
  return withBadge(viewer.badge, async (tx) => {
    const people = await tx.person.findMany({
      include: {
        roles: true,
        memberships: {
          include: { company: true, gym: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    return people.map((person) => ({
      personId: person.id,
      name: person.name,
      email: person.email,
      isPlatformAdmin: person.roles.some((role) => role.role === "PLATFORM_ADMIN"),
      places: person.memberships.map((membership) => ({
        membershipId: membership.id,
        companyName: membership.company.name,
        gymName: membership.gym?.name ?? null,
        role: membership.role,
        isActive: membership.isActive,
        lifecycleState: membership.lifecycleState,
      })),
    }));
  });
}

/** Every gym, with the company it belongs to — for the "add a person" dropdown. */
export type PlaceOption = {
  companyId: string;
  companyName: string;
  gymId: string | null;
  gymName: string | null;
};

export async function listPlaces(viewer: Viewer): Promise<PlaceOption[]> {
  return withBadge(viewer.badge, async (tx) => {
    const companies = await tx.company.findMany({
      include: { gyms: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });

    const places: PlaceOption[] = [];
    for (const company of companies) {
      // The whole circuit, for roles that are not tied to one location.
      places.push({
        companyId: company.id,
        companyName: company.name,
        gymId: null,
        gymName: null,
      });
      for (const gym of company.gyms) {
        places.push({
          companyId: company.id,
          companyName: company.name,
          gymId: gym.id,
          gymName: gym.name,
        });
      }
    }
    return places;
  });
}
