export function isPowerSearchActive(stack = []) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const overlay = stack[i];
    if (overlay.type === 'fullscreen') {
      return overlay.id === 'powerSearch';
    }
  }
  return false;
}
