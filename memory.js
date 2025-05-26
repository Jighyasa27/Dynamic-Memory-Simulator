import { firstFit, bestFit, worstFit, nextFit } from './strategy.js';

let lastAllocatedBlock = -1;
export let memoryBlocks = [];

export function addMemoryBlock(size) {
  memoryBlocks.push({
    size,
    allocated: false,
    processSize: 0,
    processId: null
  });
}

export function allocateProcess(processSize, processId, strategy) {
  let index = -1;
  if (strategy === 'firstFit') index = firstFit(memoryBlocks, processSize);
  else if (strategy === 'bestFit') index = bestFit(memoryBlocks, processSize);
  else if (strategy === 'worstFit') index = worstFit(memoryBlocks, processSize);
  else if (strategy === 'nextFit') index = nextFit(memoryBlocks, processSize, lastAllocatedBlock);

  if (index !== -1) {
    lastAllocatedBlock = index;
    memoryBlocks[index].allocated = true;
    memoryBlocks[index].processSize = processSize;
    memoryBlocks[index].processId = processId;
  } 
  else {
    alert('No suitable block found');
  }
  console.log(lastAllocatedBlock);
  
}

export function deallocateProcess(processId) {
  memoryBlocks.forEach(block => {
    if (block.allocated && block.processId === processId) {
      block.allocated = false;
      block.processId = null;
      block.processSize = 0;
    }
  });
}

export function calculateFragmentation(blocks) {
  let internal = 0;
  let external = 0;
  blocks.forEach(b => {
    if (b.allocated) internal += b.size - b.processSize;
    else external += b.size;
  });
  return { internal, external };
}
