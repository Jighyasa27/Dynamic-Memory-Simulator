export let processQueue = [];

const ProcessState = {
  NEW: 'new',
  READY: 'ready',
  RUNNING: 'running',
  WAITING: 'waiting',
  TERMINATED: 'terminated'
};

export function addProcessToQueue(pid, burstTime, arrivalTime = 0) {
  processQueue.push({ 
    processId: pid, 
    burstTime: burstTime, 
    remaining: burstTime,
    arrivalTime: arrivalTime,
    state: ProcessState.NEW,
    startTime: null,
    finishTime: null,
    waitingTime: 0,
    turnaroundTime: 0
  });
}

export function emptyQueue() {
  processQueue = [];
}

export function runFCFSScheduler() {
  let currentTime = 0;
  let data = [];
  let log = "";
  let ganttData = [];
 
  const sortedProcesses = [...processQueue].sort((a, b) => a.arrivalTime - b.arrivalTime);
  
  for (const process of sortedProcesses) {
   
    if (process.arrivalTime > currentTime) {
      log += `CPU idle from ${currentTime} to ${process.arrivalTime}\n`;
      ganttData.push({
        id: 'idle',
        start: currentTime,
        end: process.arrivalTime,
        type: 'idle'
      });
      currentTime = process.arrivalTime;
    }
    
    process.state = ProcessState.RUNNING;
    process.startTime = currentTime;
    
    log += `Executing ${process.processId} from ${currentTime} to ${currentTime + process.burstTime}\n`;
    ganttData.push({
      id: process.processId,
      start: currentTime,
      end: currentTime + process.burstTime,
      type: 'process'
    });
    
    currentTime += process.burstTime;
    process.state = ProcessState.TERMINATED;
    process.finishTime = currentTime;
    
    process.turnaroundTime = process.finishTime - process.arrivalTime;
    process.waitingTime = process.turnaroundTime - process.burstTime;
    
    log += `Process ${process.processId} completed. Turnaround: ${process.turnaroundTime}, Waiting: ${process.waitingTime}\n`;
    
    data.push({
      id: process.processId,
      at: process.arrivalTime,
      bt: process.burstTime,
      ft: process.finishTime,
      tat: process.turnaroundTime,
      wt: process.waitingTime
    });
  }
  
  
  const avgTurnaround = data.reduce((sum, p) => sum + p.tat, 0) / data.length;
  const avgWaiting = data.reduce((sum, p) => sum + p.wt, 0) / data.length;
  
  log += `\nAverage Turnaround Time: ${avgTurnaround.toFixed(2)}\n`;
  log += `Average Waiting Time: ${avgWaiting.toFixed(2)}\n`;
  
  return [log, data, ganttData, { avgTAT: avgTurnaround, avgWT: avgWaiting }];
}

export function runSJFScheduler() {
  let currentTime = 0;
  let data = [];
  let log = "";
  let ganttData = [];
  let remainingProcesses = [...processQueue];
  
  
  remainingProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);
  
  while (remainingProcesses.length > 0) {

    const availableProcesses = remainingProcesses.filter(p => p.arrivalTime <= currentTime);
    
    if (availableProcesses.length === 0) {
     
      const nextArrival = Math.min(...remainingProcesses.map(p => p.arrivalTime));
      log += `CPU idle from ${currentTime} to ${nextArrival}\n`;
      ganttData.push({
        id: 'idle',
        start: currentTime,
        end: nextArrival,
        type: 'idle'
      });
      currentTime = nextArrival;
      continue;
    }
    const shortestJob = availableProcesses.reduce(
      (shortest, current) => current.burstTime < shortest.burstTime ? current : shortest, 
      availableProcesses[0]
    );
    
    shortestJob.state = ProcessState.RUNNING;
    shortestJob.startTime = currentTime;
    
    log += `Executing ${shortestJob.processId} from ${currentTime} to ${currentTime + shortestJob.burstTime}\n`;
    ganttData.push({
      id: shortestJob.processId,
      start: currentTime,
      end: currentTime + shortestJob.burstTime,
      type: 'process'
    });
    
    currentTime += shortestJob.burstTime;
    shortestJob.state = ProcessState.TERMINATED;
    shortestJob.finishTime = currentTime;
    
    shortestJob.turnaroundTime = shortestJob.finishTime - shortestJob.arrivalTime;
    shortestJob.waitingTime = shortestJob.turnaroundTime - shortestJob.burstTime;
    
    log += `Process ${shortestJob.processId} completed. Turnaround: ${shortestJob.turnaroundTime}, Waiting: ${shortestJob.waitingTime}\n`;
    
    data.push({
      id: shortestJob.processId,
      at: shortestJob.arrivalTime,
      bt: shortestJob.burstTime,
      ft: shortestJob.finishTime,
      tat: shortestJob.turnaroundTime,
      wt: shortestJob.waitingTime
    });
    remainingProcesses = remainingProcesses.filter(p => p.processId !== shortestJob.processId);
  }
  
  // Calculate averages
  const avgTurnaround = data.reduce((sum, p) => sum + p.tat, 0) / data.length;
  const avgWaiting = data.reduce((sum, p) => sum + p.wt, 0) / data.length;
  
  log += `\nAverage Turnaround Time: ${avgTurnaround.toFixed(2)}\n`;
  log += `Average Waiting Time: ${avgWaiting.toFixed(2)}\n`;
  
  return [log, data, ganttData, { avgTAT: avgTurnaround, avgWT: avgWaiting }];
}

// Round Robin Scheduler
export function runRoundRobinScheduler(quantum) {
  let currentTime = 0;
  let data = [];
  let log = "";
  let ganttData = [];
  let remainingProcesses = [...processQueue].map(p => ({ ...p }));
  let completed = [];
  
  remainingProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);
  

  let readyQueue = [];
  
  while (remainingProcesses.length > 0 || readyQueue.length > 0) {
 
    const newlyArrived = remainingProcesses.filter(p => p.arrivalTime <= currentTime);
    readyQueue.push(...newlyArrived);
    remainingProcesses = remainingProcesses.filter(p => p.arrivalTime > currentTime);
    
    if (readyQueue.length === 0) {
      
      if (remainingProcesses.length > 0) {
        const nextArrival = Math.min(...remainingProcesses.map(p => p.arrivalTime));
        log += `CPU idle from ${currentTime} to ${nextArrival}\n`;
        ganttData.push({
          id: 'idle',
          start: currentTime,
          end: nextArrival,
          type: 'idle'
        });
        currentTime = nextArrival;
      }
      continue;
    }
    
    const process = readyQueue.shift();
    
    process.state = ProcessState.RUNNING;
    
    const executeTime = Math.min(process.remaining, quantum);
    
    log += `Executing ${process.processId} from ${currentTime} to ${currentTime + executeTime}\n`;
    ganttData.push({
      id: process.processId,
      start: currentTime,
      end: currentTime + executeTime,
      type: 'process'
    });
    
   
    currentTime += executeTime;
    process.remaining -= executeTime;
    
    // Check if process is complete
    if (process.remaining <= 0) {
      process.state = ProcessState.TERMINATED;
      process.finishTime = currentTime;
      
      // Calculate metrics
      process.turnaroundTime = process.finishTime - process.arrivalTime;
      process.waitingTime = process.turnaroundTime - process.burstTime;
      
      log += `Process ${process.processId} completed. Turnaround: ${process.turnaroundTime}, Waiting: ${process.waitingTime}\n`;
      
      // Add to completed processes
      completed.push({
        id: process.processId,
        at: process.arrivalTime,
        bt: process.burstTime,
        ft: process.finishTime,
        tat: process.turnaroundTime,
        wt: process.waitingTime
      });
    } else {
      // Process still has remaining time, put back in ready queue
      process.state = ProcessState.READY;
      readyQueue.push(process);
    }
    
    // Move any newly arrived processes to ready queue
    const newArrivals = remainingProcesses.filter(p => p.arrivalTime <= currentTime);
    readyQueue.push(...newArrivals);
    remainingProcesses = remainingProcesses.filter(p => p.arrivalTime > currentTime);
  }
  
  // Calculate averages
  const avgTurnaround = completed.reduce((sum, p) => sum + p.tat, 0) / completed.length;
  const avgWaiting = completed.reduce((sum, p) => sum + p.wt, 0) / completed.length;
  
  log += `\nAverage Turnaround Time: ${avgTurnaround.toFixed(2)}\n`;
  log += `Average Waiting Time: ${avgWaiting.toFixed(2)}\n`;
  
  return [log, completed, ganttData, { avgTAT: avgTurnaround, avgWT: avgWaiting }];
}
