---
name: email-manager
description: Manage email workflows — draft, send, search, and organize emails. Supports Gmail, Outlook, and IMAP. Includes templates for common email types and smart inbox organization. Trigger when user wants to draft emails, search inbox, organize messages, or automate email workflows.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [email, gmail, outlook, productivity, communication, templates, automation]
    category: productivity
---

# Email Manager

## When to Use
- User wants to draft an email
- User asks to search or organize their inbox
- User wants email templates for common scenarios
- User asks to automate email workflows (follow-ups, sorting, labeling)
- User wants to check for important unread messages

## Procedure

1. **Identify the email provider**: Determine if the user uses Gmail, Outlook, or another provider. Use the appropriate tool:
   - Gmail: `gws` CLI or Gmail API
   - Outlook: Microsoft Graph API
   - Generic: IMAP via Python `imaplib`

2. **For drafting emails**:
   - Identify the purpose (informational, request, follow-up, introduction)
   - Use the appropriate template (see below)
   - Keep subject lines clear and action-oriented
   - Keep body concise (5 sentences max for routine emails)
   - Include a clear call-to-action

3. **Email templates**:

   **Follow-up**:
   ```
   Subject: Following up: [Original subject]
   
   Hi [Name],
   
   I wanted to follow up on my previous email about [topic]. 
   
   [Brief reminder of the ask or context]
   
   Would you have time to [specific action] this week?
   
   Best,
   [Your name]
   ```

   **Introduction**:
   ```
   Subject: Introduction - [Your name] / [Mutual connection]
   
   Hi [Name],
   
   [Mutual connection] suggested I reach out regarding [reason].
   
   [1-2 sentences about who you are and why you're reaching out]
   
   Would you be open to a brief call next week?
   
   Best,
   [Your name]
   ```

   **Status update**:
   ```
   Subject: [Project] Update - [Date]
   
   Hi team,
   
   Quick update on [project]:
   
   ✅ Completed: [Item 1], [Item 2]
   🔄 In progress: [Item 3]
   ⚠️ Blocked: [Item 4] - [Reason]
   
   Next steps: [What happens next]
   
   [Your name]
   ```

4. **For inbox organization**:
   - Search for emails matching criteria (sender, subject, date range)
   - Apply labels/folders based on rules
   - Flag important unread messages
   - Archive processed emails

5. **Present results**: Show drafted email for review, or display search results in a formatted list.

## Examples

### Example 1: Draft an email
```
Input: "Draft a follow-up email to John about the proposal I sent last week"
Expected behavior: Generate a professional follow-up email template with appropriate tone
```

### Example 2: Inbox search
```
Input: "Find all emails from my boss in the last 7 days"
Expected behavior: Search inbox, display matching emails with subject, date, and preview
```

## Pitfalls
- **Tone matching**: Adjust formality based on the recipient. Peers = casual, executives = formal.
- **Attachment reminders**: Always check if you mentioned an attachment and actually attach it.
- **Reply-all discipline**: Don't reply-all unless everyone needs to see your response.
- **Security**: Never include sensitive data (passwords, API keys) in emails.

## Verification
- Review drafted emails for tone and completeness before sending
- Verify search results match the query criteria
- Check that labels/rules are applied correctly
