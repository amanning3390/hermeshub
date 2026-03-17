---
name: slack-bot
description: Send messages, monitor channels, react to posts, and manage Slack workflows. Use when the user mentions Slack, team chat, channel messages, or notifications.
version: "1.0.0"
license: MIT
compatibility: Requires Slack Bot Token with chat:write, channels:read, channels:history scopes
metadata:
  author: hermeshub
  hermes:
    tags: [slack, messaging, team-chat, notifications]
    category: communication
required_environment_variables:
  - name: SLACK_BOT_TOKEN
    prompt: Slack Bot Token (starts with xoxb-)
    help: Create a Slack app at https://api.slack.com/apps
    required_for: full functionality
---

# Slack Bot

Team communication through Slack's API.

## When to Use
- User wants to send or read Slack messages
- User needs channel monitoring or alerts
- User wants to post status updates or reports
- User asks about team conversations

## Procedure
1. Verify Slack token is configured
2. Identify target channel or user
3. Perform the messaging operation
4. Confirm delivery

## Operations
- Send message to channel or DM
- Read recent messages from a channel
- React to messages with emoji
- Create and manage threads
- Post formatted blocks (rich text, buttons, etc.)
- Schedule messages for later delivery
- List channels and members

## Message Formatting
Use Slack's Block Kit for rich messages:
- Text sections with markdown
- Dividers and headers
- Button actions
- Code blocks

## Pitfalls
- Bot must be invited to channels to read/write
- Rate limits: 1 message per second per channel
- File uploads require files:write scope
- Thread replies need the parent message timestamp

## Verification
- Message appears in target channel
- Reactions are visible on the message
- Scheduled messages show in Slack's scheduled list
