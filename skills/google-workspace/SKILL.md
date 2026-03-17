---
name: google-workspace
description: Unified access to Gmail, Google Calendar, Drive, Docs, Sheets, and Contacts. Use when the user mentions email, calendar, documents, spreadsheets, or Google services.
version: "1.0.0"
license: MIT
compatibility: Requires Google Workspace account and OAuth credentials
metadata:
  author: hermeshub
  hermes:
    tags: [gmail, google-calendar, google-drive, google-docs, google-sheets]
    category: productivity
required_environment_variables:
  - name: GOOGLE_CLIENT_ID
    prompt: Google OAuth Client ID
    help: Create at https://console.cloud.google.com/apis/credentials
    required_for: full functionality
  - name: GOOGLE_CLIENT_SECRET
    prompt: Google OAuth Client Secret
    help: From the same OAuth credentials page
    required_for: full functionality
---

# Google Workspace Integration

Complete access to Google Workspace services through a single skill.

## When to Use
- User mentions email, Gmail, inbox, or sending messages
- User asks about calendar, schedule, events, or meetings
- User references Google Drive, Docs, Sheets, or file management
- User wants to search or organize Google Workspace content

## Supported Services

### Gmail
- Search and read emails with advanced query syntax
- Compose, reply, and forward messages
- Manage labels and filters
- Summarize unread messages

### Google Calendar
- List upcoming events and check availability
- Create, update, and delete events
- Set reminders and recurring events
- Find free slots across calendars

### Google Drive
- Search files by name, type, or content
- Upload, download, and organize files
- Share files and manage permissions
- Create folders and move files

### Google Docs
- Create new documents from templates or scratch
- Read and search document content
- Append or modify existing documents

### Google Sheets
- Read and analyze spreadsheet data
- Write data to specific cells or ranges
- Create charts and summaries
- Run formulas and data transformations

## Procedure
1. Check if Google OAuth credentials are configured
2. If not, guide user through setup at https://console.cloud.google.com
3. Use appropriate Google API for the requested service
4. Format results clearly with relevant metadata
5. For multi-service requests, batch operations where possible

## Pitfalls
- OAuth tokens expire — handle refresh automatically
- Rate limits apply per API — implement exponential backoff
- Large file downloads should stream to disk, not memory
- Calendar timezone handling requires explicit user timezone

## Verification
- Confirm operation completed by reading back the result
- For email sends, verify the message appears in Sent
- For calendar events, confirm the event exists with correct details
