/**
 * Content Sanitization — Anti-Prompt-Injection Pipeline
 * Serverless-compatible version for Vercel API functions.
 */

const INJECTION_PATTERNS: [RegExp, string][] = [
  [/ignore\s+(all\s+)?previous\s+instructions/i, "prompt_override"],
  [/you\s+are\s+now\s+(a|an)\s+unrestricted/i, "jailbreak"],
  [/disregard\s+(your|all)\s+(rules|instructions|guidelines)/i, "prompt_override"],
  [/system\s*:\s*you\s+are/i, "system_prompt"],
  [/<\|im_start\|>/i, "chatml_injection"],
  [/<\|im_end\|>/i, "chatml_injection"],
  [/ADMIN_OVERRIDE/i, "privilege_escalation"],
  [/jailbreak/i, "jailbreak"],
  [/DAN\s+mode/i, "jailbreak"],
  [/developer\s+mode\s+(enabled|output)/i, "jailbreak"],
  [/\[INST\]/i, "format_injection"],
  [/\[\/INST\]/i, "format_injection"],
  [/<<SYS>>/i, "format_injection"],
  [/<\/?system>/i, "format_injection"],
  [/\beval\s*\(/i, "code_execution"],
  [/\bexec\s*\(/i, "code_execution"],
  [/base64\s+(--)?decode/i, "obfuscation"],
  [/fromCharCode/i, "obfuscation"],
  [/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "hidden_chars"],
];

interface SanitizationResult {
  clean: string;
  rejected: boolean;
  rejectionReason?: string;
  flagsFound: string[];
}

function sanitizeText(input: string, maxLength: number, fieldName: string): SanitizationResult {
  if (!input || typeof input !== "string") {
    return { clean: "", rejected: false, flagsFound: [] };
  }

  let text = input;
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");

  const flagsFound: string[] = [];
  for (const [pattern, category] of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flagsFound.push(category);
    }
  }

  const criticalFlags = ["prompt_override", "jailbreak", "system_prompt", "chatml_injection", "format_injection", "privilege_escalation"];
  const hasCritical = flagsFound.some(f => criticalFlags.includes(f));

  if (hasCritical) {
    return {
      clean: "",
      rejected: true,
      rejectionReason: `Prompt injection detected in ${fieldName}: ${flagsFound.join(", ")}`,
      flagsFound,
    };
  }

  text = text.slice(0, maxLength).trim();
  return { clean: text, rejected: false, flagsFound };
}

function sanitizeTextArray(
  items: string[] | undefined,
  maxItemLength: number,
  maxItems: number,
  fieldName: string
): SanitizationResult & { cleanArray: string[] } {
  if (!items || !Array.isArray(items)) {
    return { clean: "", cleanArray: [], rejected: false, flagsFound: [] };
  }

  const cleanArray: string[] = [];
  const allFlags: string[] = [];

  for (const item of items.slice(0, maxItems)) {
    const result = sanitizeText(item, maxItemLength, fieldName);
    if (result.rejected) {
      return { clean: "", cleanArray: [], rejected: true, rejectionReason: result.rejectionReason, flagsFound: result.flagsFound };
    }
    if (result.clean) {
      cleanArray.push(result.clean);
      allFlags.push(...result.flagsFound);
    }
  }

  const genericPatterns = [
    /^great\s+(skill|tool|plugin)!?$/i,
    /^nice!?$/i,
    /^good\s+(job|work)!?$/i,
    /^interesting!?$/i,
    /^awesome!?$/i,
    /^works?\s+(great|fine|well)!?$/i,
  ];

  const allGeneric = cleanArray.every(item => genericPatterns.some(p => p.test(item.trim())));
  if (allGeneric && cleanArray.length > 0) {
    return {
      clean: "", cleanArray: [], rejected: true,
      rejectionReason: `Generic feedback rejected in ${fieldName}. Provide specific, actionable suggestions.`,
      flagsFound: ["generic_spam"],
    };
  }

  return { clean: cleanArray.join("; "), cleanArray, rejected: false, flagsFound: allFlags };
}

export function sanitizeFeedback(data: {
  error_details?: string;
  error_type?: string;
  suggested_improvements?: string[];
  security_concerns?: string[];
  task_category: string;
}): { sanitized: typeof data; rejected: boolean; reason?: string } {
  if (data.error_details) {
    const result = sanitizeText(data.error_details, 500, "error_details");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_details = result.clean;
  }

  if (data.error_type) {
    const result = sanitizeText(data.error_type, 100, "error_type");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_type = result.clean;
  }

  const catResult = sanitizeText(data.task_category, 50, "task_category");
  if (catResult.rejected) return { sanitized: data, rejected: true, reason: catResult.rejectionReason };
  data.task_category = catResult.clean;

  if (data.suggested_improvements) {
    const result = sanitizeTextArray(data.suggested_improvements, 200, 5, "suggested_improvements");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.suggested_improvements = result.cleanArray;
  }

  if (data.security_concerns) {
    const result = sanitizeTextArray(data.security_concerns, 200, 3, "security_concerns");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.security_concerns = result.cleanArray;
  }

  return { sanitized: data, rejected: false };
}
