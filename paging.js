let physicalMemory = [];
let pageTable = [];
let accessSequence = [];
let pageReplacementAlgorithm = 'FIFO';
let pageFaults = 0;
let pageHits = 0;
let clockPointer = 0; 

// Initialize physical memory with empty frames
export function initializePhysicalMemory(memorySize, pageSize) {
  const frameCount = Math.floor(memorySize / pageSize);
  physicalMemory = Array(frameCount).fill().map((_, i) => ({
    frameId: i,
    pageId: null,
    lastUsed: null,
    referenced: false,
    modified: false,
    loadTime: null
  }));
  pageTable = [];
  accessSequence = [];
  pageFaults = 0;
  pageHits = 0;
  clockPointer = 0;
  return { physicalMemory, frameCount };
}

// Create page table for a process
export function createPageTable(processId, processSize, pageSize) {
  const pageCount = Math.ceil(processSize / pageSize);
  pageTable = Array(pageCount).fill().map((_, i) => ({
    processId,
    pageId: i,
    frameId: null,
    valid: false,
    referenced: false,
    modified: false,
    lastAccessed: null,
    loadCount: 0
  }));
  return pageTable;
}

// Find a free frame in physical memory
function findFreeFrame() {
  return physicalMemory.findIndex(frame => frame.pageId === null);
}

// Implement FIFO page replacement
function fifoReplacement() {
  // Find the oldest loaded frame
  const oldestFrameIndex = physicalMemory
    .filter(frame => frame.pageId !== null)
    .reduce((oldest, frame, index, frames) => 
      frame.loadTime < frames[oldest].loadTime ? index : oldest, 0);
  
  return oldestFrameIndex;
}

// Implement LRU page replacement
function lruReplacement() {
  // Find the least recently used frame
  const lruFrameIndex = physicalMemory
    .filter(frame => frame.pageId !== null)
    .reduce((lru, frame, index, frames) => 
      frame.lastUsed < frames[lru].lastUsed ? index : lru, 0);
  
  return lruFrameIndex;
}

// Implement Optimal page replacement
function optimalReplacement(currentAccessIndex) {
  // Find pages that won't be used for the longest time
  const futureAccesses = accessSequence.slice(currentAccessIndex + 1);
  
  // Calculate when each page will be used next
  const nextUse = {};
  physicalMemory.forEach(frame => {
    if (frame.pageId !== null) {
      const nextUseIndex = futureAccesses.findIndex(access => access === frame.pageId);
      nextUse[frame.frameId] = nextUseIndex === -1 ? Infinity : nextUseIndex;
    }
  });
  
  // Find the frame with the furthest next use
  const frameToReplace = Object.entries(nextUse)
    .reduce((furthest, [frameId, nextUseIndex]) => 
      nextUseIndex > furthest.nextUseIndex ? 
        { frameId: parseInt(frameId), nextUseIndex } : furthest, 
      { frameId: -1, nextUseIndex: -1 }
    ).frameId;
  
  return frameToReplace;
}

// Implement Clock page replacement
function clockReplacement() {
  const frameCount = physicalMemory.length;
  
  // Keep moving the clock hand until we find a frame with referenced bit = false
  while (true) {
    // If the current frame is not referenced, select it for replacement
    if (physicalMemory[clockPointer].pageId !== null && !physicalMemory[clockPointer].referenced) {
      const frameToReplace = clockPointer;
      clockPointer = (clockPointer + 1) % frameCount;
      return frameToReplace;
    }
    
    // Otherwise, clear the referenced bit and move to the next frame
    if (physicalMemory[clockPointer].pageId !== null) {
      physicalMemory[clockPointer].referenced = false;
    }
    
    clockPointer = (clockPointer + 1) % frameCount;
  }
}

// Access a page (read or write)
export function accessPage(pageId, isWrite = false, currentAccessIndex = -1) {
  // Check if page is already in memory
  const pageEntry = pageTable.find(p => p.pageId === pageId);
  if (!pageEntry) return { success: false, error: "Page does not exist" };
  
  // Record the access in the sequence
  accessSequence.push(pageId);
  
  if (pageEntry.valid) {
    // Page hit
    pageHits++;
    
    // Update frame metadata
    const frameIndex = physicalMemory.findIndex(f => f.frameId === pageEntry.frameId);
    if (frameIndex !== -1) {
      physicalMemory[frameIndex].lastUsed = Date.now();
      physicalMemory[frameIndex].referenced = true;
      if (isWrite) {
        physicalMemory[frameIndex].modified = true;
        pageEntry.modified = true;
      }
    }
    
    // Update page table
    pageEntry.lastAccessed = Date.now();
    pageEntry.referenced = true;
    
    return { 
      success: true, 
      pageFault: false,
      pageId,
      frameId: pageEntry.frameId
    };
  } else {
    // Page fault
    pageFaults++;
    
    // Find a free frame or replace an existing one
    let frameIndex = findFreeFrame();
    let replacedPageId = null;
    
    // If no free frames, use replacement algorithm
    if (frameIndex === -1) {
      switch (pageReplacementAlgorithm) {
        case 'FIFO':
          frameIndex = fifoReplacement();
          break;
        case 'LRU':
          frameIndex = lruReplacement();
          break;
        case 'Optimal':
          frameIndex = optimalReplacement(currentAccessIndex);
          break;
        case 'Clock':
          frameIndex = clockReplacement();
          break;
        default:
          frameIndex = fifoReplacement(); // Default to FIFO
      }
      
      // Get the page that was in this frame
      replacedPageId = physicalMemory[frameIndex].pageId;
      
      // Update the page table for the replaced page
      const replacedPage = pageTable.find(p => p.pageId === replacedPageId);
      if (replacedPage) {
        replacedPage.valid = false;
        replacedPage.frameId = null;
      }
    }
    
    // Update the frame with the new page
    physicalMemory[frameIndex] = {
      frameId: physicalMemory[frameIndex].frameId,
      pageId: pageId,
      lastUsed: Date.now(),
      referenced: true,
      modified: isWrite,
      loadTime: Date.now()
    };
    
    // Update the page table
    pageEntry.valid = true;
    pageEntry.frameId = physicalMemory[frameIndex].frameId;
    pageEntry.lastAccessed = Date.now();
    pageEntry.referenced = true;
    pageEntry.modified = isWrite;
    pageEntry.loadCount++;
    
    return {
      success: true,
      pageFault: true,
      pageId,
      frameId: pageEntry.frameId,
      replacedPageId
    };
  }
}

// Set the page replacement algorithm
export function setPageReplacementAlgorithm(algorithm) {
  const validAlgorithms = ['FIFO', 'LRU', 'Optimal', 'Clock'];
  if (validAlgorithms.includes(algorithm)) {
    pageReplacementAlgorithm = algorithm;
    return { success: true };
  } else {
    return { 
      success: false, 
      error: `Invalid algorithm. Choose from: ${validAlgorithms.join(', ')}`
    };
  }
}

// Generate memory access pattern
export function generateAccessPattern(pageCount, accessCount, localityDegree = 0.7) {
  const pattern = [];
  let currentPage = Math.floor(Math.random() * pageCount);
  
  for (let i = 0; i < accessCount; i++) {
    pattern.push(currentPage);
    
    // With probability (1-localityDegree), jump to a random page
    // Otherwise, move to an adjacent page
    if (Math.random() > localityDegree) {
      currentPage = Math.floor(Math.random() * pageCount);
    } else {
      // Move to adjacent page (with wrapping)
      const direction = Math.random() > 0.5 ? 1 : -1;
      currentPage = (currentPage + direction + pageCount) % pageCount;
    }
  }
  
  return pattern;
}

// Simulate memory access pattern
export function simulateAccessPattern(accessPattern, writePercentage = 0.3) {
  const results = [];
  accessSequence = [...accessPattern]; // Store for optimal algorithm
  
  for (let i = 0; i < accessPattern.length; i++) {
    const pageId = accessPattern[i];
    const isWrite = Math.random() < writePercentage;
    
    const result = accessPage(pageId, isWrite, i);
    results.push({
      ...result,
      accessIndex: i,
      isWrite
    });
  }
  
  return {
    results,
    summary: {
      totalAccesses: accessPattern.length,
      pageFaults,
      pageHits,
      pageFaultRate: pageFaults / accessPattern.length,
      pageHitRate: pageHits / accessPattern.length
    }
  };
}

// Get current memory state for visualization
export function getMemoryState() {
  return {
    physicalMemory: physicalMemory.map(frame => ({
      ...frame,
      isEmpty: frame.pageId === null
    })),
    pageTable: pageTable.map(page => ({
      ...page,
      inMemory: page.valid
    })),
    stats: {
      pageFaults,
      pageHits,
      pageFaultRate: (accessSequence.length > 0) ? 
        pageFaults / accessSequence.length : 0,
      utilizationRate: physicalMemory.filter(f => f.pageId !== null).length / physicalMemory.length
    }
  };
}

// Legacy function for backward compatibility
export function simulatePaging(processSize, pageSize, memorySize) {
  // Initialize memory
  initializePhysicalMemory(memorySize, pageSize);
  
  // Create page table
  const pageTable = createPageTable('P1', processSize, pageSize);
  
  // Calculate frames and pages
  const pages = Math.ceil(processSize / pageSize);
  const frames = Math.floor(memorySize / pageSize);
  
  // Simulate loading initial pages
  const result = {
    pageTable: [],
    unusedFrames: []
  };
  
  for (let i = 0; i < pages; i++) {
    if (i < frames) {
      // Page fits in memory
      result.pageTable.push({ page: i, frame: i });
    } else {
      // Page fault - not enough memory
      result.pageTable.push({ page: i, frame: -1 });
    }
  }
  
  // Collect unused frames
  for (let i = pages; i < frames; i++) {
    result.unusedFrames.push(i);
  }
  
  return result;
}
