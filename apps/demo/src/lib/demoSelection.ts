export function toggleSelectedId(currentIds: string[], id: string): string[] {
  return currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id];
}
