import { memoryBlocks, addMemoryBlock, allocateProcess, deallocateProcess, calculateFragmentation } from './memory.js';
import { simulatePaging } from './paging.js';
import { 
  simulateSegmentation, 
  initializeMemory, 
  allocateSegment, 
  deallocateSegment, 
  compactMemory, 
  getMemoryState, 
  calculateFragmentation as calculateSegmentationFragmentation 
} from './segmentation.js';
import { 
  processQueue, 
  emptyQueue, 
  addProcessToQueue, 
  runFCFSScheduler, 
  runSJFScheduler, 
  runRoundRobinScheduler
} from './scheduler.js';

const start = document.getElementById('start');

start.addEventListener('click', (e)=>{
  e.preventDefault();
  let section = document.getElementById(e.target.id.substring(2));
  if(section != null){
    section.style.display = 'block';
    start.style.display = 'none';
  }
});

// memory allocation
function renderBlocks() {
  const container = document.getElementById('memory-container');
  container.innerHTML = '';
  
  // Calculate total memory size for proportional display
  const totalMemory = memoryBlocks.reduce((sum, block) => sum + block.size, 0);
  
  // Generate a unique color for each process ID
  const processColors = {};
  const baseColors = [
    '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0',
    '#00BCD4', '#E91E63', '#673AB7', '#3F51B5', '#009688'
  ];
  
  let colorIndex = 0;
  memoryBlocks.forEach(block => {
    if (block.allocated && !processColors[block.processId]) {
      processColors[block.processId] = baseColors[colorIndex % baseColors.length];
      colorIndex++;
    }
  });
  
  
  const totalBlocks = memoryBlocks.length;
  const usedBlocks = memoryBlocks.filter(block => block.allocated).length;
  const freeBlocks = totalBlocks - usedBlocks;
  
  document.getElementById('total-blocks').textContent = totalBlocks;
  document.getElementById('used-blocks').textContent = usedBlocks;
  document.getElementById('free-blocks').textContent = freeBlocks;
  
  memoryBlocks.forEach((block, i) => {
    const div = document.createElement('div');
    div.classList.add('block', block.allocated ? 'allocated' : 'free');
    
    const widthPercentage = Math.max((block.size / totalMemory) * 100, 5);
    div.style.width = `${widthPercentage}%`;
    
    if (block.allocated) {
      div.style.backgroundColor = processColors[block.processId];
      
      const utilization = (block.processSize / block.size) * 100;
      
      
      const utilizationBar = `
        <div class="utilization-container">
          <div class="utilization-bar" style="width: ${utilization}%"></div>
          <span class="utilization-text">${Math.round(utilization)}%</span>
        </div>
      `;
      
      div.innerHTML = `
        <div class="block-header">Block ${i + 1}</div>
        <div class="block-size">${block.size} KB</div>
        <div class="process-info">
          <div class="process-id">${block.processId}</div>
          <div class="process-size">${block.processSize} KB</div>
        </div>
        ${utilizationBar}
      `;
    } else {
      div.innerHTML = `
        <div class="block-header">Block ${i + 1}</div>
        <div class="block-size">${block.size} KB</div>
        <div class="free-label">Free</div>
      `;
    }
    
    div.addEventListener('click', function() {
      if (block.allocated) {
        const internalFrag = block.size - block.processSize;
        alert(`Block ${i + 1}\nSize: ${block.size} KB\nProcess: ${block.processId}\nUsed: ${block.processSize} KB\nInternal Fragmentation: ${internalFrag} KB`);
      } else {
        alert(`Block ${i + 1}\nSize: ${block.size} KB\nStatus: Free`);
      }
    });
    
    container.appendChild(div);
  });
}

document.getElementById('addBlock').addEventListener('click', function () {
  const size = parseInt(document.getElementById('blockSize').value);
  if (size > 0) {
    addMemoryBlock(size);
    renderBlocks();
  }
});

document.getElementById('allocate').addEventListener('click', function () {
  const size = parseInt(document.getElementById('processSize').value);
  const id = document.getElementById('processId').value;
  const strategy = document.getElementById('strategy').value;
  if (size > 0 && id) {
    allocateProcess(size, id, strategy);
    renderBlocks();
  }
});

document.getElementById('deallocate').addEventListener('click', function () {
  const id = document.getElementById('deallocId').value;
  deallocateProcess(id);
  renderBlocks();
});

document.getElementById('showFragmentation').addEventListener('click', function () {
  const stats = calculateFragmentation(memoryBlocks);
  
  // Calculate additional statistics
  const totalMemory = memoryBlocks.reduce((sum, block) => sum + block.size, 0);
  const allocatedMemory = memoryBlocks.filter(b => b.allocated).reduce((sum, block) => sum + block.size, 0);
  const freeMemory = totalMemory - allocatedMemory;
  const allocationPercentage = Math.round((allocatedMemory / totalMemory) * 100);
  const freePercentage = Math.round((freeMemory / totalMemory) * 100);
  const internalFragPercentage = Math.round((stats.internal / totalMemory) * 100);
  const externalFragPercentage = Math.round((stats.external / totalMemory) * 100);
  
  document.getElementById('stats').innerHTML = `
    <h2>Memory Statistics</h2>
    
    <div class="stat-row">
      <span class="stat-label">Total Memory:</span>
      <span class="stat-value">${totalMemory} KB</span>
    </div>
    
    <div class="stat-row">
      <span class="stat-label">Allocated Memory:</span>
      <span class="stat-value">${allocatedMemory} KB (${allocationPercentage}%)</span>
    </div>
    
    <div class="stat-row">
      <span class="stat-label">Free Memory:</span>
      <span class="stat-value">${freeMemory} KB (${freePercentage}%)</span>
    </div>
    
    <div class="stat-row">
      <span class="stat-label">Internal Fragmentation:</span>
      <span class="stat-value">${stats.internal} KB (${internalFragPercentage}%)</span>
    </div>
    
    <div class="stat-row">
      <span class="stat-label">External Fragmentation:</span>
      <span class="stat-value">${stats.external} KB (${externalFragPercentage}%)</span>
    </div>
  `;
});

renderBlocks();


// Paging
document.getElementById('runPaging').addEventListener('click', function () { 
  const processSize = parseInt(document.getElementById('pagingProcessSize').value);
  const pageSize = parseInt(document.getElementById('pageSize').value);
  const memorySize = parseInt(document.getElementById('memorySizePaging').value);

  if (isNaN(processSize) || isNaN(pageSize) || isNaN(memorySize)) {
    alert('Please enter valid numeric values for all fields.');
    return;
  }

  const output = simulatePaging(processSize, pageSize, memorySize);
  
  renderPhysicalMemory(memorySize, pageSize, output.pageTable);
  
  
  renderPageTable(output.pageTable);

  document.getElementById('pagingOutput').textContent = 
    `Page Table:\n${JSON.stringify(output.pageTable, null, 2)}\n\n` +
    `Unused Frames: ${output.unusedFrames.join(', ') || 'None'}`;
});


function renderPhysicalMemory(memorySize, pageSize, pageTable) {
  const container = document.getElementById('physicalMemoryMap');
  container.innerHTML = '';
  
  const frameCount = Math.floor(memorySize / pageSize);
  
  for (let i = 0; i < frameCount; i++) {
    const frameElement = document.createElement('div');
    
    
    const page = pageTable.find(p => p.frame === i);
    const isOccupied = page !== undefined;
    
    frameElement.className = `memory-frame ${isOccupied ? 'occupied' : ''}`;
    
    const frameIdElement = document.createElement('div');
    frameIdElement.className = 'frame-id';
    frameIdElement.textContent = `F${i}`;
    
    const pageIdElement = document.createElement('div');
    pageIdElement.className = 'page-id';
    pageIdElement.textContent = isOccupied ? `P${page.page}` : '';
    
    frameElement.appendChild(frameIdElement);
    frameElement.appendChild(pageIdElement);
    
    container.appendChild(frameElement);
  }
}


function renderPageTable(pageTable) {
  const container = document.getElementById('pageTableDisplay');
  container.innerHTML = '';
  
  pageTable.forEach(page => {
    const pageElement = document.createElement('div');
    pageElement.className = `page-entry ${page.frame !== -1 ? 'valid' : 'invalid'}`;
    
    pageElement.innerHTML = `
      <div>
        <strong>Page ${page.page}</strong>
      </div>
      <div>
        ${page.frame !== -1 ? `Frame ${page.frame}` : 'Not in memory'}
      </div>
    `;
    
    container.appendChild(pageElement);
  });
}

// Segmentation
let memoryInitialized = false;


document.getElementById('initializeMemory').addEventListener('click', function() {
  const memorySize = parseInt(document.getElementById('memorySizeSeg').value);
  
  if (isNaN(memorySize) || memorySize <= 0) {
    alert('Please enter a valid memory size.');
    return;
  }
  
  initializeMemory(memorySize);
  memoryInitialized = true;
  
  document.getElementById('segmentList').innerHTML = '';
  
  renderMemoryMap();

  updateSegmentationStats();
  
  document.querySelectorAll('#segmentation .control-group:not(:first-child) button, #segmentation .control-group:not(:first-child) input')
    .forEach(el => el.disabled = false);
});

document.getElementById('addSegment').addEventListener('click', function () {
  if (!memoryInitialized) {
    alert('Please initialize memory first.');
    return;
  }
  
  const name = document.getElementById('segmentName').value.trim();
  const size = parseInt(document.getElementById('segmentSize').value);

  if (!name || isNaN(size) || size <= 0) {
    alert('Please enter a valid segment name and size.');
    return;
  }

  const result = allocateSegment({
    name,
    size
  });
  
  if (!result.success) {
    alert(`Failed to allocate segment: ${result.error}`);
    return;
  }
  
  updateSegmentList();
  renderMemoryMap();
  updateSegmentationStats();
  
  document.getElementById('segmentName').value = '';
  document.getElementById('segmentSize').value = '';
});

document.getElementById('deallocateSegment').addEventListener('click', function() {
  if (!memoryInitialized) {
    alert('Please initialize memory first.');
    return;
  }
  
  const segmentName = document.getElementById('deallocSegment').value.trim();
  
  if (!segmentName) {
    alert('Please enter a segment name to deallocate.');
    return;
  }
  
  const result = deallocateSegment(segmentName);
  
  if (!result.success) {
    alert(`Failed to deallocate segment: ${result.error}`);
    return;
  }
  
  document.getElementById('deallocSegment').value = '';
  updateSegmentList();
  renderMemoryMap();
  updateSegmentationStats();
});

document.getElementById('compactMemory').addEventListener('click', function() {
  if (!memoryInitialized) {
    alert('Please initialize memory first.');
    return;
  }
  
  const result = compactMemory();
  
  if (result.success) {
    const memoryMap = document.getElementById('segmentationMemoryMap');
    memoryMap.classList.add('compacting');
    
    setTimeout(() => {
      memoryMap.classList.remove('compacting');
    }, 1000);
    
    
    renderMemoryMap();
    updateSegmentationStats();
  }
});

function renderMemoryMap() {
  const memoryMap = document.getElementById('segmentationMemoryMap');
  memoryMap.innerHTML = '';
  
  const memoryState = getMemoryState();
  const totalMemory = memoryState.blocks.reduce((sum, block) => sum + block.size, 0);
  
  memoryState.blocks.forEach(block => {
    const blockElement = document.createElement('div');
    blockElement.className = `memory-block ${block.type}`;
    
   
    const widthPercentage = (block.size / totalMemory) * 100;
    blockElement.style.width = `${widthPercentage}%`;
    
    if (block.type === 'segment') {
      blockElement.textContent = block.name;
      
      blockElement.setAttribute('data-tooltip', 
        `${block.name}: ${block.size}KB\nBase: ${block.base}\nEnd: ${block.endAddress}`
      );
    } else {
      blockElement.textContent = 'Free';
      blockElement.setAttribute('data-tooltip', 
        `Free Space: ${block.size}KB\nBase: ${block.base}\nEnd: ${block.endAddress}`
      );
    }
    
    memoryMap.appendChild(blockElement);
  });
}

// Update segment list
function updateSegmentList() {
  const container = document.getElementById('segmentList');
  container.innerHTML = '';
  
  const memoryState = getMemoryState();
  const segments = memoryState.blocks.filter(block => block.type === 'segment');
  
  segments.forEach((segment, index) => {
    const div = document.createElement('div');
    div.className = 'segment-item';
    
    div.innerHTML = `
      <strong>${segment.name}</strong> (${segment.size}KB)<br>
      Base: ${segment.base}, Limit: ${segment.size}
    `;
    
    container.appendChild(div);
  });
  
  if (segments.length === 0) {
    container.innerHTML = '<div class="segment-item">No segments allocated</div>';
  }
}

// Update statistics panel
function updateSegmentationStats() {
  const statsPanel = document.getElementById('segmentationStats');
  const memoryState = getMemoryState();
  
  const totalMemory = memoryState.blocks.reduce((sum, block) => sum + block.size, 0);
  const usedMemory = memoryState.blocks
    .filter(block => block.type === 'segment')
    .reduce((sum, block) => sum + block.size, 0);
  
  statsPanel.innerHTML = `
    <h4>Memory Statistics</h4>
    <div class="stat-row">
      <span class="stat-label">Total Memory:</span>
      <span class="stat-value">${totalMemory} KB</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Used Memory:</span>
      <span class="stat-value">${usedMemory} KB (${Math.round((usedMemory/totalMemory)*100)}%)</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Free Memory:</span>
      <span class="stat-value">${totalMemory - usedMemory} KB</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Free Blocks:</span>
      <span class="stat-value">${memoryState.blocks.filter(block => block.type === 'free').length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Largest Free Block:</span>
      <span class="stat-value">${Math.max(...memoryState.blocks.filter(block => block.type === 'free').map(block => block.size), 0)} KB</span>
    </div>
  `;
}

// Initialize UI state
document.addEventListener('DOMContentLoaded', function() {
  // Disable segment controls until memory is initialized
  document.querySelectorAll('#segmentation .control-group:not(:first-child) button, #segmentation .control-group:not(:first-child) input')
    .forEach(el => el.disabled = true);
});

// Legacy segmentation support
document.getElementById('runSegmentation')?.addEventListener('click', function () {
  const memorySize = parseInt(document.getElementById('memorySizeSeg').value);

  if (isNaN(memorySize) || memorySize <= 0) {
    alert('Please enter a valid memory size.');
    return;
  }
  
  // Create segments array from current memory state
  const memoryState = getMemoryState();
  const segments = memoryState.blocks
    .filter(block => block.type === 'segment')
    .map(segment => ({
      name: segment.name,
      size: segment.size
    }));

  const output = simulateSegmentation(segments, memorySize);
  document.getElementById('segmentationOutput').textContent = JSON.stringify(output, null, 2);

  let totalUsed = 0;
  output.forEach(seg => {
    if (seg.base !== -1) {
      totalUsed += seg.limit;
    }
  });

  const remaining = memorySize - totalUsed;
  document.getElementById('remainingMemory').textContent = `Remaining Memory: ${remaining} KB`;
});


function updateProcessTable() {
  const tableBody = document.getElementById('process-table-body');
  tableBody.innerHTML = '';
  
  processQueue.forEach(process => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${process.processId}</td>
      <td>${process.burstTime}</td>
      <td>${process.arrivalTime}</td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Gantt chart
function renderGanttChart(ganttData) {
  const ganttChart = document.getElementById('gantt-chart');
  const ganttTimeline = document.getElementById('gantt-timeline');
  
  ganttChart.innerHTML = '';
  ganttTimeline.innerHTML = '';
  
  // Find total time span
  let maxTime = 0;
  ganttData.forEach(block => {
    if (block.end > maxTime) maxTime = block.end;
  });
  
  // Calculate scale factor (pixels per time unit)
  const scaleFactor = Math.max(30, Math.min(100, 800 / maxTime));
  
  // Generate color map for processes
  const processColors = {};
  const baseColors = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ec407a', '#7e57c2', '#5c6bc0', '#29b6f6'
  ];
  
  let colorIndex = 0;
  ganttData.forEach(block => {
    if (block.type === 'process' && !processColors[block.id]) {
      processColors[block.id] = baseColors[colorIndex % baseColors.length];
      colorIndex++;
    }
  });
  
  // Create Gantt blocks
  ganttData.forEach(block => {
    const blockElement = document.createElement('div');
    blockElement.className = `gantt-block ${block.type}`;
    
    // Set width based on duration and scale
    const width = (block.end - block.start) * scaleFactor;
    blockElement.style.width = `${width}px`;
    
    // Set color for process blocks
    if (block.type === 'process') {
      blockElement.style.backgroundColor = processColors[block.id];
    }
    
    // Add content
    blockElement.textContent = block.id;
    
    // Add tooltip
    blockElement.setAttribute('data-tooltip', 
      `${block.id}\nStart: ${block.start}\nEnd: ${block.end}\nDuration: ${block.end - block.start}`
    );
    
    ganttChart.appendChild(blockElement);
  });
  
  // Create timeline markers
  for (let i = 0; i <= maxTime; i += Math.max(1, Math.floor(maxTime / 10))) {
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.textContent = i;
    marker.style.left = `${i * scaleFactor}px`;
    ganttTimeline.appendChild(marker);
  }
}
function updateMetricsTable(data) {
  const tableBody = document.getElementById('metrics-table-body');
  tableBody.innerHTML = '';
  
  data.forEach(process => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${process.id}</td>
      <td>${process.at}</td>
      <td>${process.bt}</td>
      <td>${process.ft}</td>
      <td>${process.tat}</td>
      <td>${process.wt}</td>
    `;
    
    tableBody.appendChild(row);
  });
}

function updateAvgMetrics(metrics) {
  const avgMetricsContainer = document.getElementById('avg-metrics');
  
  avgMetricsContainer.innerHTML = `
    <div class="avg-metric-item">
      <div class="avg-metric-label">Avg. Turnaround Time</div>
      <div class="avg-metric-value">${metrics.avgTAT.toFixed(2)}</div>
    </div>
    <div class="avg-metric-item">
      <div class="avg-metric-label">Avg. Waiting Time</div>
      <div class="avg-metric-value">${metrics.avgWT.toFixed(2)}</div>
    </div>
  `;
}

// Add process to queue with arrival time and priority
document.getElementById('addSchedProcess').addEventListener('click', function () {
  const pid = document.getElementById('schedPid').value;
  const bt = parseInt(document.getElementById('burstTime').value);
  const at = parseInt(document.getElementById('arrivalTime').value) || 0;
  
  if (pid && bt > 0) {
    addProcessToQueue(pid, bt, at);
    updateProcessTable();
    
    // Clear inputs
    document.getElementById('schedPid').value = '';
    document.getElementById('burstTime').value = '';
    document.getElementById('arrivalTime').value = '0';
  }
});

// Clear process queue
document.getElementById('clear').addEventListener('click', function () {
  emptyQueue();
  updateProcessTable();
  
  // Clear results
  document.getElementById('gantt-chart').innerHTML = '';
  document.getElementById('gantt-timeline').innerHTML = '';
  document.getElementById('metrics-table-body').innerHTML = '';
  document.getElementById('avg-metrics').innerHTML = '';
  document.getElementById('scheduleOutput').textContent = '';
});

// Run FCFS algorithm
document.getElementById('runFCFS').addEventListener('click', function () {
  if (processQueue.length === 0) {
    alert('Please add processes to the queue first.');
    return;
  }
  
  const [log, data, ganttData, metrics] = runFCFSScheduler();
  
  document.getElementById('scheduleOutput').textContent = log;
  renderGanttChart(ganttData);
  updateMetricsTable(data);
  updateAvgMetrics(metrics);
});

// Run SJF algorithm
document.getElementById('runSJF').addEventListener('click', function () {
  if (processQueue.length === 0) {
    alert('Please add processes to the queue first.');
    return;
  }
  
  const [log, data, ganttData, metrics] = runSJFScheduler();
  
  document.getElementById('scheduleOutput').textContent = log;
  renderGanttChart(ganttData);
  updateMetricsTable(data);
  updateAvgMetrics(metrics);
});

// Run Round Robin algorithm
document.getElementById('runRR').addEventListener('click', function () {
  if (processQueue.length === 0) {
    alert('Please add processes to the queue first.');
    return;
  }
  
  const quantum = parseInt(document.getElementById('quantum').value);
  
  if (isNaN(quantum) || quantum <= 0) {
    alert('Please enter a valid quantum value.');
    return;
  }
  
  const [log, data, ganttData, metrics] = runRoundRobinScheduler(quantum);
  
  document.getElementById('scheduleOutput').textContent = log;
  renderGanttChart(ganttData);
  updateMetricsTable(data);
  updateAvgMetrics(metrics);
});
