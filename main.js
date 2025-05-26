import { memoryBlocks, addMemoryBlock, allocateProcess, deallocateProcess, calculateFragmentation } from './memory.js';
import { simulatePaging } from './paging.js';
import { simulateSegmentation } from './segmentation.js';
import { processQueue, emptyQueue, addProcessToQueue, runFCFSScheduler, runSJFScheduler, runRoundRobinScheduler } from './scheduler.js';

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
  memoryBlocks.forEach((block, i) => {
    const div = document.createElement('div');
    div.classList.add('block', block.allocated ? 'allocated' : 'free');
    div.innerHTML = `
      <strong>Block ${i + 1}</strong><br>
      Block Size: ${block.size}<br>
      ${block.allocated ? `Process ID: ${block.processId}<br>Process Size: ${block.processSize} ` : 'Free'}
    `;
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
  document.getElementById('stats').innerHTML = `
    Internal Fragmentation: ${stats.internal}<br>
    External Fragmentation: ${stats.external}
  `;
});

renderBlocks();


// Paging
document.getElementById('runPaging').addEventListener('click', function () { 
  const processSize = parseInt(document.getElementById('pagingProcessSize').value);
  const pageSize = parseInt(document.getElementById('pageSize').value);
  const memorySize = parseInt(document.getElementById('memorySizePaging').value);

  const output = simulatePaging(processSize, pageSize, memorySize);

  document.getElementById('pagingOutput').textContent = 
    `Page Table:\n${JSON.stringify(output.pageTable, null, 2)}\n\n` +
    `Unused Frames: ${output.unusedFrames.join(', ') || 'None'}`;
});


// Segmentation
const segments = [];

document.getElementById('addSegment').addEventListener('click', function () {
  const name = document.getElementById('segmentName').value.trim();
  const size = parseInt(document.getElementById('segmentSize').value);

  if (!name || isNaN(size) || size <= 0) {
    alert('Please enter a valid segment name and size.');
    return;
  }

  segments.push({ name, size });
  updateSegmentList();

  document.getElementById('segmentName').value = '';
  document.getElementById('segmentSize').value = '';
});

document.getElementById('runSegmentation').addEventListener('click', function () {
  const memorySize = parseInt(document.getElementById('memorySizeSeg').value);

  if (isNaN(memorySize) || memorySize <= 0) {
    alert('Please enter a valid memory size.');
    return;
  }

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

function updateSegmentList() {
  const container = document.getElementById('segmentList');
  container.innerHTML = '';
  segments.forEach((seg, index) => {
    const div = document.createElement('div');
    div.className = 'segment-item';
    div.textContent = `Segment ${index + 1}: ${seg.name} (${seg.size})`;
    container.appendChild(div);
  });
}


// Scheduling
function renderProcesses() {
  const container = document.getElementById('process-container');
  container.innerHTML = '';
  processQueue.forEach((process, i) => {
    const div = document.createElement('div');
    div.classList.add('process');
    div.innerHTML = `
      <strong>Process ${i + 1}</strong><br>
      Process ID: ${process.processId}<br>
      Burst Time: ${process.burstTime}
    `;
    container.appendChild(div);
  });
}

function showResult(data){
  const container = document.getElementById('finalOutput');
  container.innerHTML = 'PID\tBT\tTAT\tWT\n';
  data.forEach((p, i) => {
    container.innerText += `${p.id}\t${p.bt}\t${p.tat}\t${p.wt}\n`;
  });
}

document.getElementById('addSchedProcess').addEventListener('click', function () {
  const pid = document.getElementById('schedPid').value;
  const bt = parseInt(document.getElementById('burstTime').value);
  if (pid && bt > 0){
    addProcessToQueue(pid, bt);
    renderProcesses();
  }
});

document.getElementById('clear').addEventListener('click', function () {
    emptyQueue();
    renderProcesses();
});

document.getElementById('runFCFS').addEventListener('click', function () {
  const [log, data] = runFCFSScheduler();
  document.getElementById('scheduleOutput').textContent = log;
  showResult(data);
});

document.getElementById('runSJF').addEventListener('click', function () {
  const [log, data] = runSJFScheduler();
  document.getElementById('scheduleOutput').textContent = log;
  showResult(data);
});

document.getElementById('runRR').addEventListener('click',function () {
  const q = parseInt(document.getElementById('quantum').value);
  if(!isNaN(q)){
    const [log, data] = runRoundRobinScheduler(q);
    document.getElementById('scheduleOutput').textContent = log;
    showResult(data);
  }
});


