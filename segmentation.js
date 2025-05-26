export function simulateSegmentation(segments, memorySize) {
  const segmentTable = [];
  let offset = 0;

  for (let i = 0; i < segments.length; i++) {
    if (offset + segments[i].size <= memorySize) {
      segmentTable.push({
        segment: segments[i].name,
        base: offset,
        limit: segments[i].size
      });
      offset += segments[i].size;
    } else {
      segmentTable.push({
        segment: segments[i].name,
        base: -1,
        limit: segments[i].size
      }); // Not enough memory
    }
  }
  return segmentTable;
}
