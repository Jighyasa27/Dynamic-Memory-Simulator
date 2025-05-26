export let processQueue = [];

export function addProcessToQueue(pid, burstTime) {
  processQueue.push({ processId: pid, burstTime: burstTime, remaining: burstTime });
}

export function emptyQueue(){
  processQueue = [];
}

export function runFCFSScheduler() {
  let currentTime = 0;
  let data = [];
  let log = "";
  for (const process of processQueue) {
    log += `Executing ${process.processId} from ${currentTime} to ${currentTime + process.burstTime}\n`;
    log += `Process ${process.processId} completed.\n`
    currentTime += process.burstTime;
    data.push({id: process.processId, bt: process.burstTime, tat: currentTime, wt: currentTime - process.burstTime});
  }
  return [log, data];
}

export function runSJFScheduler() {
  let currentTime = 0;
  let data = [];
  let log = "";
  let tmpQueue = [...processQueue];
  tmpQueue.sort((a, b) => a.burstTime - b.burstTime);
  for (const process of tmpQueue) {
    log += `Executing ${process.processId} from ${currentTime} to ${currentTime + process.burstTime}\n`;
    log += `Process ${process.processId} completed.\n`
    currentTime += process.burstTime;
    data.push({id: process.processId, bt: process.burstTime, tat: currentTime, wt: currentTime - process.burstTime});
  }
  return [log, data];
}

export function runRoundRobinScheduler(quantum) {
  let currentTime = 0;
  let data = [];
  let log = "";
  let tmpQueue = processQueue.map(p => ({ ...p }));
  while (tmpQueue.length > 0) {
    const process = tmpQueue.shift();
    const executeTime = Math.min(process.remaining, quantum);
    log += `Executing ${process.processId} from ${currentTime} to ${currentTime + executeTime}\n`;
    currentTime += executeTime;
    process.remaining -= executeTime;
    if (process.remaining > 0) {
      tmpQueue.push(process);
    }
    else{
      log += `Process ${process.processId} completed.\n`
      data.push({id: process.processId, bt: process.burstTime, tat: currentTime, wt: currentTime - process.burstTime});
    }
  }
  return [log, data];
}
