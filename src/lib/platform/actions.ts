"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { withBadge } from "@/lib/db";
import { PATHS, requireAccess } from "@/lib/auth/guard";
import { normaliseEmail } from "@/lib/auth/passwords";
import { createFirstSignInLink } from "@/lib/auth/password-reset";
import { headers } from "next/headers";

/**
 * Setting up a tenant: a company, its gyms, and the people in it.
 *
 * Reserved for the founders. Each action re-checks access on the server before doing
 * anything — the page having rendered is not treated as permission.
 *
 * **There is deliberately no way to create another platform admin here.** The
 * application holds no INSERT privilege on `person_role`, so it could not do it even if
 * asked; founders are created by the seed, with the privileged account
 * (docs/decisions.md, 2026-08-22).
 *
 * Nothing here writes to the audit log. The database triggers do that, which is exactly
 * why they were chosen.
 */

const BUSINESS_MODELS = ["CREDITS", "SUBSCRIPTIONS", "BOTH"] as const;
type BusinessModel = (typeof BUSINESS_MODELS)[number];

const ASSIGNABLE_ROLES = ["GYM_OWNER", "STAFF", "TRAINER", "MEMBER"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export type CreateCompanyState = {
  error: "missingFields" | "nameTaken" | "failed" | null;
  createdId?: string;
};

export async function createCompanyAction(
  _previous: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const viewer = await requireAccess(PATHS.admin);

  const name = String(formData.get("name") ?? "").trim();
  const fiscalId = String(formData.get("fiscalId") ?? "").trim() || null;
  const model = String(formData.get("businessModel") ?? "").trim();

  if (name === "") {
    return { error: "missingFields" };
  }

  const businessModel: BusinessModel = (BUSINESS_MODELS as readonly string[]).includes(
    model,
  )
    ? (model as BusinessModel)
    : "CREDITS";

  const created = await withBadge(viewer.badge, async (tx) => {
    const existing = await tx.company.findFirst({ where: { name } });
    if (existing) {
      return null;
    }

    // The business model is a label, not behaviour: no module reads it yet.
    const company = await tx.company.create({
      data: { name, fiscalId, settings: { businessModel } },
    });
    return company.id;
  });

  if (created === null) {
    return { error: "nameTaken" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  return { error: null, createdId: created };
}

export type CreateGymState = {
  error: "missingFields" | "unknownPlace" | "failed" | null;
  createdId?: string;
};

export async function createGymAction(
  _previous: CreateGymState,
  formData: FormData,
): Promise<CreateGymState> {
  const viewer = await requireAccess(PATHS.admin);

  const companyId = String(formData.get("companyId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const timezone = String(formData.get("timezone") ?? "").trim() || "Europe/Rome";

  if (companyId === "" || name === "") {
    return { error: "missingFields" };
  }

  const created = await withBadge(viewer.badge, async (tx) => {
    // "Invisible" and "does not exist" are the same answer, as everywhere else.
    const company = await tx.company.findFirst({ where: { id: companyId } });
    if (!company) {
      return null;
    }

    const gym = await tx.gym.create({
      data: { companyId, name, city, timezone },
    });
    return gym.id;
  });

  if (created === null) {
    return { error: "unknownPlace" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/gyms");
  return { error: null, createdId: created };
}

export type CreatePersonState = {
  error: "missingFields" | "emailTaken" | "badRole" | "unknownPlace" | "failed" | null;
  createdId?: string;
  /** Who was just created, so the screen can say whose link this is. */
  createdName?: string;
  /**
   * A single-use, one-hour link letting the new person choose their own password
   * (docs/decisions.md, 2026-08-22, OQ-11). Present only immediately after a
   * successful creation, and never for anybody who already existed.
   */
  firstSignInLink?: string;
};

/** Where this application is answering, so a link points back at it. */
async function baseUrl(): Promise<string> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
  return `${protocol}://${host}`;
}

/**
 * Creates a person and puts them in one place, in one role.
 *
 * A person is one global human being: somebody who already exists is *not* recreated
 * here, because the same individual may be a trainer at one company and a member at
 * another. That case is reported rather than guessed at — joining an existing person to
 * a second company is a separate action, and not one Step 4 was asked for.
 */
export async function createPersonAction(
  _previous: CreatePersonState,
  formData: FormData,
): Promise<CreatePersonState> {
  const viewer = await requireAccess(PATHS.admin);

  const name = String(formData.get("name") ?? "").trim();
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();

  if (name === "" || email === "" || place === "") {
    return { error: "missingFields" };
  }

  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return { error: "badRole" };
  }

  // The dropdown sends "companyId" or "companyId:gymId".
  const [companyId, gymId = null] = place.split(":");
  if (!companyId) {
    return { error: "missingFields" };
  }

  try {
    const created = await withBadge(viewer.badge, async (tx) => {
      const company = await tx.company.findFirst({ where: { id: companyId } });
      if (!company) {
        return { outcome: "unknownPlace" as const };
      }
      if (gymId) {
        const gym = await tx.gym.findFirst({ where: { id: gymId, companyId } });
        if (!gym) {
          return { outcome: "unknownPlace" as const };
        }
      }

      // No password. They set their own through "forgotten password", exactly as a
      // member added at the desk does.
      const unusable = await hash(randomBytes(32).toString("hex"), 12);
      const personId = crypto.randomUUID();

      // Inserted without being read back: reading a person requires a membership the
      // badge can already see, which somebody created an instant ago does not have.
      await tx.$executeRaw`
        INSERT INTO dim_person (id, name, email, phone, password_hash, created_at, updated_at)
        VALUES (${personId}::uuid, ${name}, ${email}, ${phone}, ${unusable}, now(), now())
      `;

      const membership = await tx.membership.create({
        data: {
          personId,
          companyId,
          gymId,
          role: role as AssignableRole,
          // Only members have a place in the funnel.
          lifecycleState: role === "MEMBER" ? "LEAD" : null,
        },
      });

      if (role === "MEMBER") {
        await tx.lifecycleEvent.create({
          data: {
            membershipId: membership.id,
            companyId,
            gymId,
            fromState: null,
            toState: "LEAD",
            recordedById: viewer.id,
            note: "Created by the platform administrator",
          },
        });
      }

      return { outcome: "ok" as const, id: membership.id, personId };
    });

    if (created.outcome === "unknownPlace") {
      return { error: "unknownPlace" };
    }

    // Minted only now, for an account that did not exist a moment ago. An email
    // already in use never reaches this line — it leaves through `emailTaken` above.
    const link = await createFirstSignInLink(created.personId, await baseUrl());

    revalidatePath("/admin");
    revalidatePath("/admin/people");
    return {
      error: null,
      createdId: created.id,
      createdName: name,
      firstSignInLink: link,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes("dim_person_email_key") || message.includes("Unique")) {
      return { error: "emailTaken" };
    }
    throw cause;
  }
}
