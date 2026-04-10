#!/usr/bin/env node
/**
 * Human-Like Memory CLI
 *
 * Usage:
 *   node memory.mjs recall "query" [flags]
 *   node memory.mjs save "user message" "assistant response" [flags]
 *   node memory.mjs save-batch [flags]              # reads JSON from stdin
 *   node memory.mjs search "query" [flags]
 *   node memory.mjs config [flags]
 *   node memory.mjs help
 */

import { createInterface } from 'readline';

const SKILL_VERSION = '1.1.0';

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return defaultValue;
}

function parseInteger(value, defaultValue) {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseFloatValue(value, defaultValue) {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseCli(argv) {
  const args = [...argv];
  const options = {};
  const positional = [];

  while (args.length > 0) {
    const current = args.shift();

    if (!current.startsWith('--')) {
      positional.push(current);
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split('=', 2);
    const key = rawKey.trim();

    if (key === 'help') {
      options.help = true;
      continue;
    }

    const next = inlineValue ?? args.shift();
    options[key] = next;
  }

  return { positional, options };
}

function buildConfig(cliOptions) {
  const rawLimit = cliOptions['memory-limit'] ?? process.env.HUMAN_LIKE_MEM_LIMIT_NUMBER;
  const rawMinScore = cliOptions['min-score'] ?? process.env.HUMAN_LIKE_MEM_MIN_SCORE;
  const rawTimeoutMs = cliOptions['timeout-ms'] ?? process.env.HUMAN_LIKE_MEM_TIMEOUT_MS;
  const rawSaveTriggerTurns = cliOptions['save-trigger-turns'] ?? process.env.HUMAN_LIKE_MEM_SAVE_TRIGGER_TURNS;
  const rawSaveMaxMessages = cliOptions['save-max-messages'] ?? process.env.HUMAN_LIKE_MEM_SAVE_MAX_MESSAGES;

  return {
    baseUrl: cliOptions['base-url'] ?? process.env.HUMAN_LIKE_MEM_BASE_URL ?? 'https://plugin.human-like.me',
    apiKey: process.env.HUMAN_LIKE_MEM_API_KEY,
    userId: cliOptions['user-id'] ?? process.env.HUMAN_LIKE_MEM_USER_ID ?? 'default-user',
    agentId: cliOptions['agent-id'] ?? process.env.HUMAN_LIKE_MEM_AGENT_ID ?? 'main',
    scenario: cliOptions.scenario ?? process.env.HUMAN_LIKE_MEM_SCENARIO ?? 'human-like-memory-skill',
    memoryLimitNumber: Math.max(1, parseInteger(rawLimit, 6)),
    minScore: parseFloatValue(rawMinScore, 0.1),
    timeoutMs: Math.max(1000, parseInteger(rawTimeoutMs, 30000)),
    recallEnabled: parseBoolean(cliOptions['recall-enabled'] ?? process.env.HUMAN_LIKE_MEM_RECALL_ENABLED, true),
    addEnabled: parseBoolean(cliOptions['add-enabled'] ?? process.env.HUMAN_LIKE_MEM_ADD_ENABLED, true),
    autoSaveEnabled: parseBoolean(cliOptions['auto-save-enabled'] ?? process.env.HUMAN_LIKE_MEM_AUTO_SAVE_ENABLED, true),
    saveTriggerTurns: Math.max(1, parseInteger(rawSaveTriggerTurns, 5)),
    saveMaxMessages: Math.max(2, parseInteger(rawSaveMaxMessages, 20)),
  };
}

function buildMissingApiKeyError() {
  return {
    success: false,
    error: 'API key not configured. HUMAN_LIKE_MEM_API_KEY is required.',
    nextSteps: [
      'Hermes: run `hermes config set HUMAN_LIKE_MEM_API_KEY "mp_xxx"` or add it to ~/.hermes/.env',
      'Other runtimes: inject HUMAN_LIKE_MEM_API_KEY through your secret manager or shell environment',
      'Then verify with `node scripts/memory.mjs config`',
    ],
    helpUrl: 'https://plugin.human-like.me',
  };
}

async function httpRequest(url, options, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function buildRequestHeaders(cfg) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': cfg.apiKey,
    'x-request-id': `human-like-memory-skill-${Date.now()}`,
    'x-plugin-version': SKILL_VERSION,
    'x-client-type': 'skill',
  };
}

async function recallMemory(query, cliOptions) {
  const cfg = buildConfig(cliOptions);

  if (!cfg.apiKey) {
    console.error(JSON.stringify(buildMissingApiKeyError()));
    process.exit(1);
  }

  if (!cfg.recallEnabled) {
    console.log(JSON.stringify({
      success: true,
      count: 0,
      memories: [],
      message: 'Memory recall is disabled via recall_enabled=false',
    }, null, 2));
    return;
  }

  const url = `${cfg.baseUrl}/api/plugin/v1/search/memory`;
  const payload = {
    query,
    user_id: cfg.userId,
    agent_id: cfg.agentId,
    memory_limit_number: cfg.memoryLimitNumber,
    min_score: cfg.minScore,
  };

  try {
    const result = await httpRequest(url, {
      method: 'POST',
      headers: buildRequestHeaders(cfg),
      body: JSON.stringify(payload),
    }, cfg.timeoutMs);

    if (!result.success) {
      console.error(JSON.stringify({
        success: false,
        error: result.error || 'Memory retrieval failed',
      }));
      process.exit(1);
    }

    const memories = result.memories || [];
    const output = {
      success: true,
      count: memories.length,
      memories: memories.map((memory) => ({
        content: memory.description || memory.event || '',
        timestamp: memory.timestamp,
        score: memory.score,
      })),
    };

    if (memories.length > 0) {
      output.context = formatMemoriesForContext(memories);
    }

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  }
}

async function saveMemory(userMessage, assistantResponse, cliOptions) {
  const cfg = buildConfig(cliOptions);

  if (!cfg.apiKey) {
    console.error(JSON.stringify(buildMissingApiKeyError()));
    process.exit(1);
  }

  if (!cfg.addEnabled) {
    console.log(JSON.stringify({
      success: true,
      message: 'Memory storage is disabled via add_enabled=false',
    }));
    return;
  }

  const messages = [];
  if (userMessage) messages.push({ role: 'user', content: userMessage });
  if (assistantResponse) messages.push({ role: 'assistant', content: assistantResponse });

  if (messages.length === 0) {
    console.error(JSON.stringify({
      success: false,
      error: 'No messages to save',
    }));
    process.exit(1);
  }

  const url = `${cfg.baseUrl}/api/plugin/v1/add/message`;
  const sessionId = `session-${Date.now()}`;
  const payload = {
    user_id: cfg.userId,
    conversation_id: sessionId,
    messages,
    agent_id: cfg.agentId,
    tags: ['human-like-memory-skill'],
    async_mode: true,
    custom_workflows: {
      stream_params: {
        metadata: JSON.stringify({
          user_ids: [cfg.userId],
          agent_ids: [cfg.agentId],
          session_id: sessionId,
          scenario: cfg.scenario,
        }),
      },
    },
  };

  try {
    const result = await httpRequest(url, {
      method: 'POST',
      headers: buildRequestHeaders(cfg),
      body: JSON.stringify(payload),
    }, cfg.timeoutMs);

    console.log(JSON.stringify({
      success: true,
      message: 'Memory saved successfully',
      memoriesCount: result.memories_count || 0,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  }
}

async function searchMemory(query, cliOptions) {
  await recallMemory(query, cliOptions);
}

async function readStdin() {
  return await new Promise((resolve, reject) => {
    let data = '';
    const rl = createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on('line', (line) => {
      data += line;
    });

    rl.on('close', () => {
      resolve(data.trim());
    });

    rl.on('error', reject);

    setTimeout(() => {
      rl.close();
      if (!data) {
        reject(new Error('No input received from stdin'));
      }
    }, 5000);
  });
}

async function saveBatchMemory(cliOptions) {
  const cfg = buildConfig(cliOptions);

  if (!cfg.apiKey) {
    console.error(JSON.stringify(buildMissingApiKeyError()));
    process.exit(1);
  }

  if (!cfg.addEnabled) {
    console.log(JSON.stringify({
      success: true,
      message: 'Memory storage is disabled via add_enabled=false',
    }));
    return;
  }

  let inputData;
  try {
    inputData = await readStdin();
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: `Failed to read stdin: ${error.message}`,
      usage: 'echo \'[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]\' | node memory.mjs save-batch',
    }));
    process.exit(1);
  }

  let messages;
  try {
    messages = JSON.parse(inputData);
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: `Invalid JSON: ${error.message}`,
      received: inputData.substring(0, 200),
    }));
    process.exit(1);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    console.error(JSON.stringify({
      success: false,
      error: 'Messages must be a non-empty array',
    }));
    process.exit(1);
  }

  for (const message of messages) {
    if (!message.role || !message.content) {
      console.error(JSON.stringify({
        success: false,
        error: 'Each message must have "role" and "content" fields',
        invalid: message,
      }));
      process.exit(1);
    }

    if (!['user', 'assistant'].includes(message.role)) {
      console.error(JSON.stringify({
        success: false,
        error: 'Role must be "user" or "assistant"',
        invalid: message.role,
      }));
      process.exit(1);
    }
  }

  const messagesToSave = messages.slice(-cfg.saveMaxMessages);
  const url = `${cfg.baseUrl}/api/plugin/v1/add/message`;
  const sessionId = `session-${Date.now()}`;
  const payload = {
    user_id: cfg.userId,
    conversation_id: sessionId,
    messages: messagesToSave.map((message) => ({
      role: message.role,
      content: message.content.substring(0, 20000),
    })),
    agent_id: cfg.agentId,
    tags: ['human-like-memory-skill'],
    async_mode: true,
    custom_workflows: {
      stream_params: {
        metadata: JSON.stringify({
          user_ids: [cfg.userId],
          agent_ids: [cfg.agentId],
          session_id: sessionId,
          scenario: cfg.scenario,
        }),
      },
    },
  };

  try {
    const result = await httpRequest(url, {
      method: 'POST',
      headers: buildRequestHeaders(cfg),
      body: JSON.stringify(payload),
    }, cfg.timeoutMs);

    console.log(JSON.stringify({
      success: true,
      message: `Saved ${messagesToSave.length} messages to memory`,
      memoriesCount: result.memories_count || 0,
      config: {
        autoSaveEnabled: cfg.autoSaveEnabled,
        saveTriggerTurns: cfg.saveTriggerTurns,
        saveMaxMessages: cfg.saveMaxMessages,
      },
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  }
}

async function showConfig(cliOptions) {
  const cfg = buildConfig(cliOptions);

  console.log(JSON.stringify({
    baseUrl: cfg.baseUrl,
    userId: cfg.userId,
    agentId: cfg.agentId,
    apiKeyConfigured: !!cfg.apiKey,
    memoryLimitNumber: cfg.memoryLimitNumber,
    minScore: cfg.minScore,
    timeoutMs: cfg.timeoutMs,
    recallEnabled: cfg.recallEnabled,
    addEnabled: cfg.addEnabled,
    autoSaveEnabled: cfg.autoSaveEnabled,
    saveTriggerTurns: cfg.saveTriggerTurns,
    saveMaxMessages: cfg.saveMaxMessages,
    scenario: cfg.scenario,
  }, null, 2));
}

function formatMemoriesForContext(memories) {
  if (!memories || memories.length === 0) return '';

  const now = Date.now();
  const nowText = formatTime(now);

  const memoryLines = memories
    .map((memory) => {
      const date = formatTime(memory.timestamp);
      const content = memory.description || memory.event || '';
      const score = memory.score ? ` (${(memory.score * 100).toFixed(0)}%)` : '';
      if (!content) return '';
      if (date) return `   -[${date}] ${content}${score}`;
      return `   - ${content}${score}`;
    })
    .filter(Boolean);

  if (memoryLines.length === 0) return '';

  const lines = [
    '# Role',
    '',
    'You are an intelligent assistant with long-term memory capabilities. Your goal is to combine retrieved memory fragments to provide highly personalized, accurate, and logically rigorous responses.',
    '',
    '# System Context',
    '',
    `* Current Time: ${nowText} (Use this as the baseline for freshness checks)`,
    '',
    '# Memory Data',
    '',
    'Below are episodic memory summaries retrieved from long-term memory.',
    '',
    '* Memory Type: All memories are episodic summaries from previous conversations.',
    '* Special Note: If content is tagged with [assistant_opinion] or [model_summary], it represents prior AI inference rather than a direct user statement.',
    '',
    '```text',
    '<memories>',
    ...memoryLines,
    '</memories>',
    '```',
    '',
    '# Critical Protocol: Memory Safety',
    '',
    '1. Source Verification: Distinguish direct user statements from AI inference.',
    '2. Attribution Check: Never attribute third-party information to the user.',
    '3. Strong Relevance Check: Only use memories that directly help answer the current query.',
    '4. Freshness Check: Prefer the current query when memories conflict with present context.',
  ];

  return lines.join('\n');
}

function formatTime(value) {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  return String(value);
}

function printUsage() {
  console.log(`
Human-Like Memory CLI

Usage:
  node memory.mjs <command> [arguments] [flags]

Commands:
  recall <query>                    Retrieve relevant memories for a query
  save <user_msg> [assistant_msg]   Save a single conversation turn to memory
  save-batch                        Save multiple turns from stdin (JSON array)
  search <query>                    Search memories (alias for recall)
  config                            Show current configuration
  help                              Show this help text

Flags:
  --base-url <url>                  Override HUMAN_LIKE_MEM_BASE_URL
  --user-id <id>                    Override HUMAN_LIKE_MEM_USER_ID
  --agent-id <id>                   Override HUMAN_LIKE_MEM_AGENT_ID
  --scenario <name>                 Override HUMAN_LIKE_MEM_SCENARIO
  --memory-limit <n>                Override HUMAN_LIKE_MEM_LIMIT_NUMBER
  --min-score <float>               Override HUMAN_LIKE_MEM_MIN_SCORE
  --timeout-ms <n>                  Override HUMAN_LIKE_MEM_TIMEOUT_MS
  --recall-enabled <true|false>     Override HUMAN_LIKE_MEM_RECALL_ENABLED
  --add-enabled <true|false>        Override HUMAN_LIKE_MEM_ADD_ENABLED
  --auto-save-enabled <true|false>  Override HUMAN_LIKE_MEM_AUTO_SAVE_ENABLED
  --save-trigger-turns <n>          Override HUMAN_LIKE_MEM_SAVE_TRIGGER_TURNS
  --save-max-messages <n>           Override HUMAN_LIKE_MEM_SAVE_MAX_MESSAGES

Examples:
  node memory.mjs config
  node memory.mjs recall "What projects am I working on?"
  node memory.mjs recall "recent roadmap decisions" --user-id alice --agent-id main
  node memory.mjs save "I prefer UTC+8 timestamps" "Understood."
  echo '[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello!"}]' | node memory.mjs save-batch

Hermes setup:
  hermes config set HUMAN_LIKE_MEM_API_KEY "mp_xxx"
  hermes config set skills.config.human-like-memory.base_url "https://plugin.human-like.me"
  hermes config set skills.config.human-like-memory.user_id "default-user"

Generic runtime setup:
  export HUMAN_LIKE_MEM_API_KEY="mp_xxx"
  export HUMAN_LIKE_MEM_BASE_URL="https://plugin.human-like.me"
`);
}

const parsed = parseCli(process.argv.slice(2));
const [command, ...commandArgs] = parsed.positional;

if (!command || parsed.options.help || command === 'help' || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

switch (command) {
  case 'recall':
    if (!commandArgs[0]) {
      console.error('Error: Query is required for recall');
      process.exit(1);
    }
    await recallMemory(commandArgs.join(' '), parsed.options);
    break;

  case 'save':
    if (!commandArgs[0]) {
      console.error('Error: At least one message is required for save');
      process.exit(1);
    }
    await saveMemory(commandArgs[0], commandArgs[1], parsed.options);
    break;

  case 'save-batch':
    await saveBatchMemory(parsed.options);
    break;

  case 'search':
    if (!commandArgs[0]) {
      console.error('Error: Query is required for search');
      process.exit(1);
    }
    await searchMemory(commandArgs.join(' '), parsed.options);
    break;

  case 'config':
    await showConfig(parsed.options);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
