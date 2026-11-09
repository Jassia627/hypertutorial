import { spawn } from 'node:child_process';

export function runProcess(command, args, { cwd, env = process.env, timeout = 300000, signal, echo = false } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Process cancelled')); return; }
    let child, output = '', reason;
    const stop = message => { reason ??= message; child?.kill('SIGTERM'); };
    const abort = () => stop('Process cancelled');
    const timer = setTimeout(() => stop('Process timeout'), timeout);
    const clean = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    try { child = spawn(command, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { clean(); reject(new Error(`Process launch failed: ${error.code ?? 'unknown'}`)); return; }
    signal?.addEventListener('abort', abort, { once: true });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-65536); if (echo) process.stdout.write(chunk); });
    child.once('error', error => { clean(); reject(new Error(`Process launch failed: ${error.code ?? 'unknown'}`)); });
    child.once('close', (status, killedSignal) => {
      clean();
      if (reason || status !== 0 || killedSignal) {
        const error = new Error(reason ?? `Process failed: exit ${status}, signal ${killedSignal ?? 'none'}`);
        Object.assign(error, { status, signal: killedSignal, output }); reject(error);
      } else resolve({ status, output });
    });
  });
}
export const isGpuStartupFailure = output => /(?:failed to (?:initialize|create) (?:the )?GPU (?:device|context)|GPU (?:device|context) initialization failed|no compatible GPU device)/i.test(output);
