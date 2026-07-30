import { setScopeAction } from "@/app/actions";
import { withBadge } from "@/lib/db";
import { scopeKey, type Scope } from "@/lib/tenancy/scope";
import type { Viewer } from "@/lib/tenancy/active-scope";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Lets somebody choose which company or gym they are looking at.
 *
 * For most people the choices are the places they belong to, already carried on their
 * session. **A platform admin belongs nowhere**, so their list is fetched from the
 * database — which is also a live demonstration that the badge works: the query below
 * runs with a PLATFORM badge, and only a PLATFORM badge would return more than one
 * company.
 */
async function platformChoices(viewer: Viewer): Promise<Scope[]> {
  return withBadge(viewer.badge, async (tx) => {
    const companies = await tx.company.findMany({
      where: { isActive: true },
      include: { gyms: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });

    return companies.flatMap((company) => [
      {
        companyId: company.id,
        companyName: company.name,
        gymId: null,
        gymName: null,
        role: "PLATFORM_ADMIN",
        level: "PLATFORM" as const,
      },
      ...company.gyms.map((gym) => ({
        companyId: company.id,
        companyName: company.name,
        gymId: gym.id,
        gymName: gym.name,
        role: "PLATFORM_ADMIN",
        level: "PLATFORM" as const,
      })),
    ]);
  });
}

function label(scope: Scope, t: Dictionary): string {
  return scope.gymName
    ? `${scope.companyName} — ${scope.gymName}`
    : `${scope.companyName} (${t.nav.wholeCircuit})`;
}

export async function ScopeSwitcher({ viewer, t }: { viewer: Viewer; t: Dictionary }) {
  const isPlatformAdmin = viewer.platformRoles.includes("PLATFORM_ADMIN");
  const choices = isPlatformAdmin ? await platformChoices(viewer) : viewer.scopes;

  if (choices.length < 2) {
    return null;
  }

  const current = viewer.activeScope ? scopeKey(viewer.activeScope) : "";

  return (
    <form action={setScopeAction} className="inline">
      <label htmlFor="scope" className="visually-hidden">
        {t.nav.switchScope}
      </label>
      <select
        id="scope"
        name="scope"
        defaultValue={current}
        className="scope-select"
        // Submitting on change keeps this to one control instead of a select plus a
        // button. It degrades to needing the button below if scripting is off.
      >
        {choices.map((scope) => (
          <option key={scopeKey(scope)} value={scopeKey(scope)}>
            {label(scope, t)}
          </option>
        ))}
      </select>
      <button type="submit" className="link-button">
        {t.common.back === "Indietro" ? "Vai" : "Go"}
      </button>
    </form>
  );
}
