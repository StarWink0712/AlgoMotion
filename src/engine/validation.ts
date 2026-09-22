// Diagnostic paths may contain untrusted property names; only protocol names are public.
const fields = new Set('input title summary inputSchema outputDescription constraints assumptions questions supported limitation examples inputJson expectedJson explanation python frames step line action grid active visited blocked queue path dp dependencies from to label chosen variables result version panels kind source style edges layout theme description id properties required items type minimum maximum additionalProperties maxItems minItems minLength maxLength enum'.split(' '));
export function safeDiagnosticPath(path: readonly (string | number)[]) {
  return path.map((p) => typeof p === 'number' ? `[${p}]` : fields.has(p) ? p : '*').join('.').replace(/\.\[/g, '[').slice(0, 140) || 'root';
}
const rules = {
  JSON_SYNTAX: '不是合法 JSON 编码。', JSON_LIMIT: 'JSON 超出大小/深度限制或包含不安全键。',
  ROOT_OBJECT: '输入约定根节点必须为 object。', REQUIRED_DECLARATION: 'object 必须显式声明 required 数组。',
  REQUIRED_REFERENCE: 'required 引用了未声明的属性。', REQUIRED: '缺少必填字段。', EXTRA_FIELDS: '包含未声明字段。',
  TYPE: '数据类型不符合约定。', ENUM: '值不在约定枚举中。', LENGTH: '数组或字符串长度超出约定范围。',
  RANGE: '数值超出约定范围或不是安全的有限数值。', ARRAY_ITEMS: '数组约定缺少 items。',
} as const;
export class DataValidationError extends Error {
  constructor(readonly path: (string | number)[], readonly rule: keyof typeof rules) {
    super(`${safeDiagnosticPath(path)}: ${rules[rule]}`);
  }
}
export function parseJsonField(value: string, path: (string | number)[]): unknown {
  try { return JSON.parse(value); } catch { throw new DataValidationError(path, 'JSON_SYNTAX'); }
}
