import { warmRuntime } from './lib/setup.mjs';

// Development/preset startup must not depend on an optional container engine.
// This hook never installs packages, builds images or creates a new VM profile.
await warmRuntime();
