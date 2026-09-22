import { parseOptions, setup } from './lib/setup.mjs';

try { process.exitCode = await setup(parseOptions(process.argv.slice(2))); }
catch (error) { console.error(`SETUP INCOMPLETE: ${error.message}`); process.exitCode = 1; }
