export function getNextDialogFocusIndex(
  currentIndex: number,
  itemCount: number,
  backwards: boolean
): number {
  if (itemCount <= 0) return -1;

  if (backwards) {
    return currentIndex <= 0 || currentIndex >= itemCount ? itemCount - 1 : currentIndex - 1;
  }

  return currentIndex < 0 || currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
}
