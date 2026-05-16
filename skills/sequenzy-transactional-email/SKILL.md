---
name: sequenzy-transactional-email
description: Send transactional emails through Sequenzy from an AI agent using templates or raw HTML, with safe recipient and payload validation.
version: 1.0.0
author: Sequenzy
license: MIT
metadata:
  hermes:
    tags: [transactional-email, email-api, saas, templates, notifications]
    homepage: https://sequenzy.com
---

# Sequenzy Transactional Email

Use this skill when a user asks an agent to send or test a transactional email through Sequenzy, such as onboarding messages, alerts, receipts, invitations, trial notices, or product notifications.

## Setup

```bash
npm install -g @sequenzy/cli@latest
sequenzy login
# or
export SEQUENZY_API_KEY="seq_live_..."
```

Verify auth:

```bash
sequenzy whoami
sequenzy account
```

## Safety rules

1. Confirm the recipient, subject, template/raw HTML, and variables before sending externally.
2. Use a test recipient first when the user is designing or QAing copy.
3. Do not send bulk marketing through the transactional flow.
4. Never expose API keys or secrets in logs, prompts, or email content.
5. Include a short post-send report with recipient, subject, and command result.

## Template send

```bash
sequenzy transactional send   --to user@example.com   --template <template-id>   --data '{"first_name":"Jane","plan":"Pro"}'
```

## Raw HTML send

```bash
sequenzy transactional send   --to user@example.com   --subject "Your usage alert"   --html-file email.html
```

## Agent workflow

1. Run `sequenzy whoami` to verify the account.
2. Inspect or create the intended template if needed.
3. Validate the recipient and variables.
4. Ask for explicit approval before sending to a real external recipient.
5. Run the send command.
6. Report success/failure concisely.

## Example tasks

- "Send a test transactional welcome email to me."
- "Use the trial-expiring template and send it to this user."
- "Create a usage alert HTML email and send it through Sequenzy."

## References

- Website: https://sequenzy.com
- CLI package: https://www.npmjs.com/package/@sequenzy/cli
