"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { withBadge } from "@/lib/db";
import { requireAccess, PATHS } from "@/lib/auth/guard";
import { normaliseEmail } from "@/lib/auth/passwords";
import { canMove, isLifecycleState } from "@/lib/members/lifecycle";

/**
 * Everything that changes a member or a trainer.
 *
 * Each action re-checks access on the server before doing anything — the page having
 * rendered is not treated as permission. Each then travels with the viewer's badge, so
 * the database refuses anything the application might wrongly ask for.
 *
 * Nothing here writes to the audit log: the database triggers do that, which is exactly
 * why they were chosen. There is no way to add a feature and forget.
 */

export type CreateMemberState = {
  error: "missingFields" | "emailTaken" | "failed" | null;
  createdId?: string;
};

export async function createMemberAction(
  _previous: CreateMemberState,
  formData: FormData,
): Promise<CreateMemberState> {
  const viewer = await requireAccess(PATHS.desk);

  const name = String(formData.get("name") ?? "").trim();
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const level = String(formData.get("level") ?? "").trim() || null;
  const capRaw = String(formData.get("packageCap") ?? "").trim();
  const packageCap = capRaw === "" ? null : Number(capRaw);

  if (name === "" || email === "") {
    return { error: "missingFields" };
  }

  const scope = viewer.activeScope;
  if (!scope) {
    return { error: "failed" };
  }

  try {
    const created = await withBadge(viewer.badge, async (tx) => {
      // A member added at the desk has no password yet. This one is random and is
      // never given to anybody: they set their own through "forgotten password".
      const unusable = await hash(randomBytes(32).toString("hex"), 12);

      // Written as raw SQL, deliberately, and the identifier generated here.
      //
      // Prisma's `create` asks the database to hand the new row straight back, and
      // reading a person requires a membership the badge can already see — which a
      // person created one instant ago does not yet have. Rather than loosen that rule,
      // the row is inserted without being read back. The membership created immediately
      // below is what makes them visible, and from then on the ordinary policy applies.
      const personId = crypto.randomUUID();

      await tx.$executeRaw`
        INSERT INTO dim_person (id, name, email, phone, password_hash, created_at, updated_at)
        VALUES (${personId}::uuid, ${name}, ${email}, ${phone}, ${unusable}, now(), now())
      `;

      const membership = await tx.membership.create({
        data: {
          personId,
          companyId: scope.companyId,
          gymId: scope.gymId,
          role: "MEMBER",
          lifecycleState: "LEAD",
          level,
          packageCap: Number.isFinite(packageCap) ? packageCap : null,
        },
      });

      await tx.lifecycleEvent.create({
        data: {
          membershipId: membership.id,
          companyId: scope.companyId,
          gymId: scope.gymId,
          fromState: null,
          toState: "LEAD",
          recordedById: viewer.id,
          note: "Created at the desk",
        },
      });

      return membership.id;
    });

    revalidatePath("/desk/members");
    return { error: null, createdId: created };
  } catch (cause) {
    // The email may already belong to somebody at another company — whom this badge
    // cannot see, so it could not have been checked in advance.
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes("dim_person_email_key") || message.includes("Unique")) {
      return { error: "emailTaken" };
    }
    throw cause;
  }
}

export type LifecycleState_ = { error: "notAllowed" | "failed" | null };

export async function changeLifecycleAction(
  _previous: LifecycleState_,
  formData: FormData,
): Promise<LifecycleState_> {
  const viewer = await requireAccess(PATHS.desk);

  const membershipId = String(formData.get("membershipId") ?? "");
  const to = String(formData.get("toState") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!isLifecycleState(to) || membershipId === "") {
    return { error: "notAllowed" };
  }

  const outcome = await withBadge(viewer.badge, async (tx) => {
    const membership = await tx.membership.findFirst({
      where: { id: membershipId, role: "MEMBER" },
    });

    // Invisible and non-existent are the same answer here, on purpose.
    if (!membership) {
      return "failed" as const;
    }

    const from = membership.lifecycleState;
    if (!canMove(from, to)) {
      return "notAllowed" as const;
    }

    await tx.membership.update({
      where: { id: membership.id },
      data: { lifecycleState: to },
    });

    await tx.lifecycleEvent.create({
      data: {
        membershipId: membership.id,
        companyId: membership.companyId,
        gymId: membership.gymId,
        fromState: from,
        toState: to,
        recordedById: viewer.id,
        note,
      },
    });

    return null;
  });

  revalidatePath(`/desk/members/${membershipId}`);
  revalidatePath("/desk/members");
  return { error: outcome };
}

/**
 * Trainers are deactivated, never deleted, so every session they ever ran stays
 * attributed to them.
 *
 * Members who had them as their usual trainer are left unassigned rather than moved to
 * somebody chosen automatically — who trains whom is the owner's decision, not the
 * software's.
 */
export async function setTrainerActiveAction(formData: FormData): Promise<void> {
  const viewer = await requireAccess(PATHS.owner);

  const membershipId = String(formData.get("membershipId") ?? "");
  const activate = String(formData.get("activate") ?? "") === "true";

  if (membershipId === "") {
    return;
  }

  await withBadge(viewer.badge, async (tx) => {
    const trainer = await tx.membership.findFirst({
      where: { id: membershipId, role: "TRAINER" },
    });
    if (!trainer) {
      return;
    }

    await tx.membership.update({
      where: { id: trainer.id },
      // `deactivated_at` is deliberately NOT set here. A database trigger derives it
      // from `is_active`, so the application cannot stamp it with its own clock — the
      // rule that cost two hours of drift the first time it was broken.
      data: { isActive: activate },
    });

    if (!activate) {
      await tx.membership.updateMany({
        where: { defaultTrainerId: trainer.id },
        data: { defaultTrainerId: null },
      });
    }
  });

  revalidatePath("/owner/trainers");
}
