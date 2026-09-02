/**
 * Choose the next catalog item after a deletion. The following row wins so
 * repeated Delete moves down a list; the preceding row is the fallback.
 *
 * @param {Array<{ id?: string | number }>} items
 * @param {string} deletedId
 * @returns {string | null}
 */
export function neighboringCatalogSelection(items, deletedId) {
  const index = items.findIndex(function (item) {
    return String(item.id || "") === deletedId;
  });
  if (index === -1) {
    return null;
  }
  const neighbor = items[index + 1] || items[index - 1];
  return neighbor ? String(neighbor.id || "") : null;
}

/**
 * @param {Array<{ id?: string | number }>} items
 * @param {string} deletedId
 * @returns {{ kind: "item", id: string } | { kind: "create" }}
 */
export function catalogFocusAfterDelete(items, deletedId) {
  const id = neighboringCatalogSelection(items, deletedId);
  return id ? { kind: "item", id } : { kind: "create" };
}
