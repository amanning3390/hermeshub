/**
 * Content Sanitization — Anti-Prompt-Injection Pipeline
 *
 * All agent-submitted text goes through this before storage.
 * Designed to prevent the Moltbook-style prompt injection cascade
 * where one agent's content hijacks another agent's behavior.
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
  // Unicode homoglyphs / zero-width chars used to hide instructions
  [/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "hidden_chars"],
];

export interface SanitizationResult {
  clean: string;
  rejected: boolean;
  rejectionReason?: string;
  flagsFound: string[];
}

/**
 * Sanitize a single text field from agent-submitted feedback.
 * - Strips HTML/markdown formatting
 * - Detects and rejects prompt injection patterns
 * - Removes hidden Unicode characters
 * - Truncates to maxLength
 */
export function sanitizeText(
  input: string,
  maxLength: number,
  fieldName: string
): SanitizationResult {
  if (!input || typeof input !== "string") {
    return { clean: "", rejected: false, flagsFound: [] };
  }

  let text = input;

  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Remove zero-width and invisible Unicode characters
  text = text.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, "");

  // Check for injection patterns
  const flagsFound: string[] = [];
  for (const [pattern, category] of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flagsFound.push(category);
    }
  }

  // Critical injection patterns → reject entirely
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

  // Truncate
  text = text.slice(0, maxLength).trim();

  return { clean: text, rejected: false, flagsFound };
}

/**
 * Sanitize an array of text items (e.g., suggested_improvements).
 * Rejects the entire array if any item contains injection.
 */
export function sanitizeTextArray(
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
      return {
        clean: "",
        cleanArray: [],
        rejected: true,
        rejectionReason: result.rejectionReason,
        flagsFound: result.flagsFound,
      };
    }
    if (result.clean) {
      cleanArray.push(result.clean);
      allFlags.push(...result.flagsFound);
    }
  }

  // Reject generic/empty feedback
  const genericPatterns = [
    /^great\s+(skill|tool|plugin)!?$/i,
    /^nice!?$/i,
    /^good\s+(job|work)!?$/i,
    /^interesting!?$/i,
    /^awesome!?$/i,
    /^works?\s+(great|fine|well)!?$/i,
  ];

  const allGeneric = cleanArray.every(item =>
    genericPatterns.some(p => p.test(item.trim()))
  );

  if (allGeneric && cleanArray.length > 0) {
    return {
      clean: "",
      cleanArray: [],
      rejected: true,
      rejectionReason: `Generic feedback rejected in ${fieldName}. Provide specific, actionable suggestions.`,
      flagsFound: ["generic_spam"],
    };
  }

  return { clean: cleanArray.join("; "), cleanArray, rejected: false, flagsFound: allFlags };
}

/**
 * Full sanitization pass on a feedback submission.
 * Returns sanitized data or rejection reason.
 */
export function sanitizeFeedback(data: {
  error_details?: string;
  error_type?: string;
  suggested_improvements?: string[];
  security_concerns?: string[];
  task_category: string;
}): { sanitized: typeof data; rejected: boolean; reason?: string } {
  // Sanitize error_details
  if (data.error_details) {
    const result = sanitizeText(data.error_details, 500, "error_details");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_details = result.clean;
  }

  // Sanitize error_type
  if (data.error_type) {
    const result = sanitizeText(data.error_type, 100, "error_type");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.error_type = result.clean;
  }

  // Sanitize task_category
  const catResult = sanitizeText(data.task_category, 50, "task_category");
  if (catResult.rejected) return { sanitized: data, rejected: true, reason: catResult.rejectionReason };
  data.task_category = catResult.clean;

  // Sanitize suggested_improvements
  if (data.suggested_improvements) {
    const result = sanitizeTextArray(data.suggested_improvements, 200, 5, "suggested_improvements");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.suggested_improvements = result.cleanArray;
  }

  // Sanitize security_concerns
  if (data.security_concerns) {
    const result = sanitizeTextArray(data.security_concerns, 200, 3, "security_concerns");
    if (result.rejected) return { sanitized: data, rejected: true, reason: result.rejectionReason };
    data.security_concerns = result.cleanArray;
  }

  return { sanitized: data, rejected: false };
}
