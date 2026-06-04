---
name: meeting-prep-assistant
description: Prepare comprehensive briefings for upcoming meetings. Researches attendees, reviews past meeting notes, summarizes relevant documents, and creates an agenda. Trigger when user wants to prepare for a meeting, get briefed on attendees, or create a meeting agenda.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [meeting, preparation, briefing, agenda, productivity, calendar]
    category: productivity
---

# Meeting Prep Assistant

## When to Use
- User wants to prepare for an upcoming meeting
- User asks about meeting attendees (background, role, recent activity)
- User wants to create a meeting agenda
- User asks for a briefing document before a meeting
- User wants to review past meeting notes for context

## Procedure

1. **Gather meeting details**: Collect the meeting title, date/time, attendee list, and any linked documents or previous notes.

2. **Research attendees** (if names/emails provided):
   - Look up each attendee's role and responsibilities
   - Check recent work activity (commits, documents, projects)
   - Note any relevant context (recent decisions, ongoing projects)

3. **Review past context**:
   - Search for previous meeting notes on the same topic
   - Review any shared documents or presentations
   - Check for open action items from previous meetings

4. **Create meeting briefing document**:
   ```
   # Meeting Brief: [Title]
   ## Date/Time: [When]
   ## Attendees: [List with roles]
   
   ## Context
   [Summary of background and why this meeting matters]
   
   ## Key Topics
   1. [Topic 1] - [Why it matters]
   2. [Topic 2] - [Why it matters]
   3. [Topic 3] - [Why it matters]
   
   ## Open Questions
   - [Question 1]
   - [Question 2]
   
   ## Suggested Agenda
   1. [ ] Review previous action items (5 min)
   2. [ ] [Main topic discussion] (15 min)
   3. [ ] [Decision needed] (10 min)
   4. [ ] Next steps and action items (5 min)
   
   ## Preparation Checklist
   - [ ] Review [specific document]
   - [ ] Prepare [specific data/input]
   - [ ] Confirm [specific detail]
   ```

5. **Present the briefing**: Show the formatted briefing document and offer to save it to a file.

## Examples

### Example 1: Standard meeting prep
```
Input: "I have a product review meeting with Sarah (PM), Mike (eng lead), and Lisa (design) tomorrow at 2pm"
Expected behavior: Create a briefing document with attendee context, suggested agenda, and preparation checklist
```

### Example 2: Quick agenda
```
Input: "Create an agenda for my 1:1 with my manager"
Expected behavior: Generate a structured 1:1 agenda with common topics (updates, blockers, career growth, feedback)
```

## Pitfalls
- **Time zones**: Always confirm time zones for remote meetings.
- **Over-preparation**: Keep briefings concise. Focus on what's actionable.
- **Privacy**: Don't include sensitive personal information about attendees.

## Verification
- Verify attendee names and roles are correct
- Check that the agenda fits within the meeting duration
- Ensure all linked documents are accessible
