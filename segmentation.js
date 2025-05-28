let memory = [];

export function initializeMemory(totalSize) {
  memory = [{
    type: 'free',
    base: 0,
    size: totalSize
  }];
  return memory;
}


function findHole(size) {
  for (let i = 0; i < memory.length; i++) {
    if (memory[i].type === 'free' && memory[i].size >= size) {
      return i;
    }
  }
  return -1;
}


export function allocateSegment(segment) {
  const holeIndex = findHole(segment.size);
  
  if (holeIndex === -1) {
    return {
      success: false,
      error: "No suitable hole found for segment"
    };
  }
  
  const hole = memory[holeIndex];
  
 
  const newSegment = {
    type: 'segment',
    name: segment.name,
    base: hole.base,
    size: segment.size,
    protection: {
      read: segment.protection?.read || true,
      write: segment.protection?.write || true,
      execute: segment.protection?.execute || false
    }
  };
  

  if (hole.size === segment.size) {
    
    memory[holeIndex] = newSegment;
  } else {
    
    const remainingHole = {
      type: 'free',
      base: hole.base + segment.size,
      size: hole.size - segment.size
    };
    
    memory[holeIndex] = newSegment;
    memory.splice(holeIndex + 1, 0, remainingHole);
  }
  
 
  memory.sort((a, b) => a.base - b.base);
  
  return {
    success: true,
    segment: newSegment
  };
}

export function deallocateSegment(segmentName) {
  const index = memory.findIndex(block => 
    block.type === 'segment' && block.name === segmentName
  );
  
  if (index === -1) {
    return {
      success: false,
      error: "Segment not found"
    };
  }
  
  memory[index].type = 'free';
  delete memory[index].name;
  delete memory[index].protection;
  
  mergeHoles();
  
  return {
    success: true
  };
}


function mergeHoles() {
  for (let i = 0; i < memory.length - 1; i++) {
    if (memory[i].type === 'free' && memory[i+1].type === 'free') {
      memory[i].size += memory[i+1].size;
      memory.splice(i+1, 1);
      i--; 
    }
  }
}

export function compactMemory() {
  
  const segments = memory.filter(block => block.type === 'segment');
  
  // Calculate total used space
  const totalUsed = segments.reduce((sum, seg) => sum + seg.size, 0);
  
  const totalSize = memory.reduce((sum, block) => sum + block.size, 0);

  memory = [];
  let currentBase = 0;
  
  
  segments.forEach(segment => {
    const newSegment = { ...segment, base: currentBase };
    memory.push(newSegment);
    currentBase += segment.size;
  });
  
  
  if (totalSize > totalUsed) {
    memory.push({
      type: 'free',
      base: currentBase,
      size: totalSize - totalUsed
    });
  }
  
  return {
    success: true,
    compactionPerformed: true,
    fragmentation: calculateFragmentation()
  };
}

// Calculate external fragmentation
export function calculateFragmentation() {
  const freeBlocks = memory.filter(block => block.type === 'free');
  const totalFree = freeBlocks.reduce((sum, block) => sum + block.size, 0);
  const largestFree = freeBlocks.length > 0 
    ? Math.max(...freeBlocks.map(block => block.size))
    : 0;
  
  return {
    totalFree,
    freeBlocks: freeBlocks.length,
    largestFree,
    externalFragmentation: totalFree > 0 ? (1 - largestFree / totalFree) * 100 : 0
  };
}


export function getMemoryState() {
  return {
    blocks: memory.map(block => ({
      ...block,
      
      isSegment: block.type === 'segment',
      isFree: block.type === 'free',
      endAddress: block.base + block.size - 1
    })),
    fragmentation: calculateFragmentation()
  };
}

export function simulateSegmentation(segments, memorySize) {
 
  initializeMemory(memorySize);
  
  const segmentTable = [];
  
  for (let i = 0; i < segments.length; i++) {
    const result = allocateSegment({
      name: segments[i].name,
      size: segments[i].size,
      protection: {
        read: true,
        write: true,
        execute: false
      }
    });
    
    if (result.success) {
      segmentTable.push({
        segment: segments[i].name,
        base: result.segment.base,
        limit: segments[i].size,
        protection: result.segment.protection
      });
    } else {
      segmentTable.push({
        segment: segments[i].name,
        base: -1,
        limit: segments[i].size,
        error: "Not enough memory"
      });
    }
  }
  
  return segmentTable;
}
