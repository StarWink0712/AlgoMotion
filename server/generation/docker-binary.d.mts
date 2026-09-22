export function resolveDockerBinary(options?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exists?: (path: string) => boolean;
}): string;
interface RuntimeOptions { platform?: NodeJS.Platform; env?: NodeJS.ProcessEnv; exists?: (path: string) => boolean }
export const colimaProfile: string;
export const colimaContext: string;
export function colimaConfigPath(env?: NodeJS.ProcessEnv): string;
export function resolveColimaBinary(options?: RuntimeOptions): string;
export function containerRuntime(options?: RuntimeOptions): 'colima' | 'external';
export function dockerConnection(options?: RuntimeOptions): { binary: string; prefix: string[]; runtime: 'colima' | 'external' };
