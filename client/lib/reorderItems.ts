export type Reorderable = { id: string; sort_order: number | null };

/**
 * Move an item one step in a list and reindex `sort_order` to 0..n-1.
 * Using array index as the persisted order avoids swapping stale/negative
 * sort_order values, which previously made "move up" save as a lower position.
 */
export function moveItemInList<T extends Reorderable>(
  items: T[],
  id: string,
  direction: "up" | "down",
): T[] | null {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return null;

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= items.length) return null;

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, sort_order: index }));
}
