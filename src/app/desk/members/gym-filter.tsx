import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Narrows the list to one location.
 *
 * **A filter, not a permission.** It changes what is shown and nothing else — the
 * viewer keeps exactly the authority they had (docs/decisions.md, 2026-08-22, OQ-10).
 * The owner's words: to somebody tracking one gym, the other gyms are noise.
 *
 * A plain GET form, so the chosen location lives in the address bar: it survives a
 * refresh, it can be bookmarked, and it is obvious what is being filtered.
 */
export function GymFilter({
  t,
  gyms,
  selected,
}: {
  t: Dictionary;
  gyms: { id: string; name: string }[];
  selected: string | null;
}) {
  if (gyms.length === 0) {
    return null;
  }

  return (
    <form method="get" className="gym-filter">
      <label htmlFor="sede">{t.members.filterGym}</label>
      <select id="sede" name="sede" defaultValue={selected ?? ""}>
        <option value="">{t.members.allGyms}</option>
        {gyms.map((gym) => (
          <option key={gym.id} value={gym.id}>
            {gym.name}
          </option>
        ))}
      </select>
      <button type="submit" className="link-button">
        {t.members.applyFilter}
      </button>
    </form>
  );
}
