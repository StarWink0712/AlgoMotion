import { z } from 'zod';
import { DataValidationError, safeDiagnosticPath } from '../../src/engine/validation';

// Only known protocol field names and numeric indexes; never echo values or arbitrary keys.
const types = new Set(['string', 'number', 'array', 'object', 'boolean', 'null', 'undefined', 'integer']);
export function validationHint(error: unknown) {
  if (error instanceof DataValidationError) return `${error.message} (${error.rule})`;
  if (!(error instanceof z.ZodError)) return '内部校验失败；未公开原始异常。';
  return error.issues.slice(0, 4).map((issue) => {
    const path = safeDiagnosticPath(issue.path);
    const rule = issue.code === 'invalid_type' ? `应为 ${types.has(issue.expected) ? issue.expected : '协议类型'}，实际为 ${types.has(issue.received) ? issue.received : '其他类型'}`
      : issue.code === 'too_big' ? `超过上限 ${issue.maximum}` : issue.code === 'too_small' ? `低于下限 ${issue.minimum}`
        : issue.code === 'unrecognized_keys' ? '包含未允许字段（字段名已隐藏）'
          : issue.code === 'invalid_literal' ? issue.expected === 'grid' ? 'grid 面板的 source 必须为 grid' : '不符合协议指定常量'
            : issue.code === 'invalid_string' ? '字符串格式不符合协议；绑定不能包含表达式或 frame. 前缀'
              : issue.code === 'invalid_enum_value' ? '不在协议允许的枚举中' : issue.code;
    return `${path}: ${rule}`;
  }).join('；');
}
