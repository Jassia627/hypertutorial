import { loadProject } from './common.mjs';
try {
  const { spec } = loadProject(process.argv[2]);
  console.log(`Valid spec v${spec.version}: ${spec.states.length} states, ${spec.steps.length} steps`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
