import { withBadge } from "@/lib/db";
import type { Viewer } from "@/lib/tenancy/active-scope";

/**
 * Reading members.
 *
 * Every query here travels with the viewer's badge, so the database itself decides which
 * rows come back. Nothing filters by company in application code — it does not have to,
 * and relying on it would be the weaker of the two locks.
 */

export type MemberRow = {
  membershipId: string;
  personId: string;
  name: string;
  email: string;
  lifecycleState: string | null;
  level: string | null;
  gymName: string | null;
  isActive: boolean;
  joinedAt: Date;
};

export async function listMembers(viewer: Viewer): Promise<MemberRow[]> {
  return withBadge(viewer.badge, async (tx) => {
    const rows = await tx.membership.findMany({
      where: { role: "MEMBER" },
      include: { person: true, gym: true },
      orderBy: [{ isActive: "desc" }, { joinedAt: "desc" }],
      take: 200,
    });

    return rows.map((row) => ({
      membershipId: row.id,
      personId: row.personId,
      name: row.person.name,
      email: row.person.email,
      lifecycleState: row.lifecycleState,
      level: row.level,
      gymName: row.gym?.name ?? null,
      isActive: row.isActive,
      joinedAt: row.joinedAt,
    }));
  });
}

export type TrainerRow = {
  membershipId: string;
  name: string;
  email: string;
  gymName: string | null;
  isActive: boolean;
  deactivatedAt: Date | null;
  clientsAssigned: number;
};

export async function listTrainers(viewer: Viewer): Promise<TrainerRow[]> {
  return withBadge(viewer.badge, async (tx) => {
    const rows = await tx.membership.findMany({
      where: { role: "TRAINER" },
      include: {
        person: true,
        gym: true,
        _count: { select: { clientsAssigned: true } },
      },
      orderBy: [{ isActive: "desc" }, { joinedAt: "asc" }],
    });

    return rows.map((row) => ({
      membershipId: row.id,
      name: row.person.name,
      email: row.person.email,
      gymName: row.gym?.name ?? null,
      isActive: row.isActive,
      deactivatedAt: row.deactivatedAt,
      clientsAssigned: row._count.clientsAssigned,
    }));
  });
}

export type MemberDetail = {
  membershipId: string;
  name: string;
  email: string;
  phone: string | null;
  lifecycleState: string | null;
  level: string | null;
  packageCap: number | null;
  gymName: string | null;
  companyName: string;
  isActive: boolean;
  joinedAt: Date;
  defaultTrainerName: string | null;
  history: {
    id: string;
    fromState: string | null;
    toState: string;
    occurredAt: Date;
    note: string | null;
    recordedByName: string | null;
  }[];
  audit: {
    id: string;
    action: string;
    tableName: string;
    changedAt: Date;
    changedByName: string | null;
  }[];
};

export async function getMember(
  viewer: Viewer,
  membershipId: string,
): Promise<MemberDetail | null> {
  return withBadge(viewer.badge, async (tx) => {
    const membership = await tx.membership.findFirst({
      where: { id: membershipId, role: "MEMBER" },
      include: {
        person: true,
        gym: true,
        company: true,
        defaultTrainer: { include: { person: true } },
        lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 50 },
      },
    });

    // Null here is not "missing": it is also what a badge with no right to this row
    // sees. The two are deliberately indistinguishable from outside.
    if (!membership) {
      return null;
    }

    const actorIds = [
      ...new Set(
        membership.lifecycleEvents
          .map((event) => event.recordedById)
          .filter((id): id is string => id !== null),
      ),
    ];

    const actors = actorIds.length
      ? await tx.person.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const actorName = new Map(actors.map((person) => [person.id, person.name]));

    const auditRows = await tx.auditLog.findMany({
      where: {
        OR: [
          { tableName: "bridge_membership", rowId: membership.id },
          { tableName: "dim_person", rowId: membership.personId },
        ],
      },
      orderBy: { changedAt: "desc" },
      take: 25,
    });

    const auditActorIds = [
      ...new Set(
        auditRows
          .map((row) => row.changedById)
          .filter((id): id is string => id !== null),
      ),
    ];
    const auditActors = auditActorIds.length
      ? await tx.person.findMany({
          where: { id: { in: auditActorIds } },
          select: { id: true, name: true },
        })
      : [];
    const auditActorName = new Map(
      auditActors.map((person) => [person.id, person.name]),
    );

    return {
      membershipId: membership.id,
      name: membership.person.name,
      email: membership.person.email,
      phone: membership.person.phone,
      lifecycleState: membership.lifecycleState,
      level: membership.level,
      packageCap: membership.packageCap,
      gymName: membership.gym?.name ?? null,
      companyName: membership.company.name,
      isActive: membership.isActive,
      joinedAt: membership.joinedAt,
      defaultTrainerName: membership.defaultTrainer?.person.name ?? null,
      history: membership.lifecycleEvents.map((event) => ({
        id: event.id,
        fromState: event.fromState,
        toState: event.toState,
        occurredAt: event.occurredAt,
        note: event.note,
        recordedByName: event.recordedById
          ? (actorName.get(event.recordedById) ?? null)
          : null,
      })),
      audit: auditRows.map((row) => ({
        id: String(row.id),
        action: row.action,
        tableName: row.tableName,
        changedAt: row.changedAt,
        changedByName: row.changedById
          ? (auditActorName.get(row.changedById) ?? null)
          : null,
      })),
    };
  });
}
