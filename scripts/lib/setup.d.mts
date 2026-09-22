export interface Options { [flag: string]: boolean }
export interface CommandResult { code: number; output: string }
export interface Host {
  platform: NodeJS.Platform; env: NodeJS.ProcessEnv; version: string; root: string; node: string;
  exists: (path: string) => boolean;
  run: (command: string, args: string[], options?: { inherit?: boolean; timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv }) => Promise<CommandResult>;
  readConfig: () => Promise<string>; ensureEnv: () => Promise<boolean>;
  log: (message: string) => void; sleep: (ms: number) => Promise<void>; now: () => number;
}
export const projectRoot: string;
export function validNode(version: string): boolean;
export function parseOptions(args: string[]): Options;
export function installPlan(platform: NodeJS.Platform, env?: NodeJS.ProcessEnv, exists?: (path: string) => boolean): { command: string; args: string[]; prerequisite: string; check: string[] };
export function colimaStartArgs(existing: boolean): string[];
export function readSettings(text: string, env?: NodeJS.ProcessEnv): Record<string, string>;
export function ensureEnv(root?: string): Promise<boolean>;
export function defaultHost(): Host;
export function warmRuntime(host?: Host): Promise<boolean>;
export function setup(options: Options, host?: Host): Promise<number>;
