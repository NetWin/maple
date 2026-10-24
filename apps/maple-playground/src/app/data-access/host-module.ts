/**
 * The host context is a JavaScript module the playground imports natively, as trusted host code.
 * Its two optional named exports become what Maple hands to the script:
 *
 * ```js
 * export const INSTANCE_DATA = { upperCase: (text) => text.toUpperCase() }; // new Maple({ globals })
 * export const RUN_DATA = { name: 'Steve' }; // maple.run(code, data)
 * ```
 */
export interface HostContext {
  /** Read-only bindings every run of the instance sees, host functions included. */
  instanceData: Record<string, unknown>;
  /** The data of one run; the script gets a copy it may change. */
  runData: Record<string, unknown>;
}

const EXPORTS: ReadonlyArray<string> = ['INSTANCE_DATA', 'RUN_DATA'];

/** The host module failed to load or exports something else than an object for each name. */
export class HostModuleError extends Error {
  public override readonly name = 'HostModuleError';
}

/** Puts `source` behind a URL a worker can `import()`; revoke it once no worker needs it. */
export function createModuleUrl(source: string): string {
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
}

/** Imports the module at `url` and checks its exports. */
export async function importHostContext(url: string): Promise<HostContext> {
  let namespace: object;
  try {
    namespace = await import(/* @vite-ignore */ url);
  } catch (error) {
    throw new HostModuleError(describe(error), { cause: error });
  }

  const exports = new Map<string, unknown>(Object.entries(namespace));
  const unknown = [...exports.keys()].filter((name) => !EXPORTS.includes(name));
  if (unknown.length > 0) {
    const names = unknown.map((name) => `'${name}'`).join(', ');
    const noun = unknown.length === 1 ? 'export' : 'exports';
    throw new HostModuleError(
      `Unexpected ${noun} ${names}; export INSTANCE_DATA and RUN_DATA only`
    );
  }
  return {
    instanceData: readObject(exports, 'INSTANCE_DATA'),
    runData: readObject(exports, 'RUN_DATA')
  };
}

/**
 * Copies the export's own enumerable keys, the ones Maple reads, into a record. A missing export
 * stands for an empty object.
 */
function readObject(exports: Map<string, unknown>, name: string): Record<string, unknown> {
  const value = exports.get(name);
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HostModuleError(`${name} must be an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
