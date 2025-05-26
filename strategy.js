export function firstFit(blocks, size) {
  return blocks.findIndex(b => !b.allocated && b.size >= size);
}

export function bestFit(blocks, size) {
  let bestIdx = -1;
  let minDiff = Infinity;
  blocks.forEach((b, i) => {
    if (!b.allocated && b.size >= size && (b.size - size) < minDiff) {
      bestIdx = i;
      minDiff = b.size - size;
    }
  });
  return bestIdx;
}

export function worstFit(blocks, size) {
  let worstIdx = -1;
  let maxDiff = -1;
  blocks.forEach((b, i) => {
    if (!b.allocated && b.size >= size && (b.size - size) > maxDiff) {
      worstIdx = i;
      maxDiff = b.size - size;
    }
  });
  return worstIdx;
}

export function nextFit(blocks, size, prev) {
  if(prev == -1){
    return firstFit(blocks, size);
  }
  const n = blocks.length;
  for (let i = prev+1; i < n; i++) {
    if (!blocks[i].allocated && blocks[i].size >= size) {
      return i;
    }
  }
  return -1;
}
