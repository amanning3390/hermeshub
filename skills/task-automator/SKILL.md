---
name: task-automator
description: Automate repetitive tasks and workflows. Creates scripts and scheduled jobs for common automation needs — file organization, data entry, report generation, notifications, and more. Trigger when user wants to automate a task, create a scheduled job, or eliminate repetitive manual work.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [automation, tasks, scheduling, scripting, productivity, cron, workflow]
    category: productivity
---

# Task Automator

## When to Use
- User wants to automate a repetitive task
- User asks to create a scheduled job (cron, Task Scheduler)
- User wants to eliminate manual data entry or file management
- User asks about automating reports, notifications, or data sync
- User wants to create a script for a recurring workflow

## Procedure

1. **Identify the task to automate**: Understand:
   - What is the task? (step-by-step breakdown)
   - How often does it run? (hourly, daily, weekly, on-event)
   - What are the inputs and outputs?
   - What tools/APIs are involved?

2. **Design the automation**:
   - Break the task into discrete steps
   - Identify decision points (if/else logic)
   - Define error handling (what if a step fails?)
   - Determine notification method (log file, email, Slack)

3. **Implement the automation**:

   **File organization**:
   ```bash
   # Example: Sort downloads folder by file type
   #!/bin/bash
   cd ~/Downloads
   mkdir -p Images Documents Archives Code Other
   mv *.jpg *.png *.gif Images/ 2>/dev/null
   mv *.pdf *.docx *.xlsx Documents/ 2>/dev/null
   mv *.zip *.tar.gz Archives/ 2>/dev/null
   mv *.py *.js *.ts Code/ 2>/dev/null
   ```

   **Report generation**:
   - Use Python with pandas for data processing
   - Generate reports in CSV, Excel, or HTML format
   - Schedule with cron (Linux/Mac) or Task Scheduler (Windows)

   **Notifications**:
   - Use `curl` to send Slack/Discord webhooks
   - Use `sendmail` or SMTP for email notifications
   - Use system notifications (`notify-send` on Linux, `osascript` on Mac)

4. **Schedule the automation**:
   - **cron** (Linux/Mac): `crontab -e`
     - `0 9 * * *` = daily at 9am
     - `0 */6 * * *` = every 6 hours
     - `0 9 * * 1` = every Monday at 9am
   - **Task Scheduler** (Windows): Use `schtasks` command
   - **GitHub Actions**: Use `on: schedule` with cron syntax

5. **Test the automation**: Run manually first, verify output, then enable scheduling.

6. **Document**: Include a header comment in the script explaining what it does, when it runs, and how to modify it.

## Examples

### Example 1: File cleanup
```
Input: "Automate cleaning up my downloads folder every night"
Expected behavior: Create a script that sorts files by type and a cron job to run it nightly
```

### Example 2: Daily report
```
Input: "Generate a daily report of my crypto portfolio and email it to me"
Expected behavior: Create a Python script that fetches prices, generates a report, and sends via email, scheduled with cron
```

## Pitfalls
- **Error handling**: Always include try/catch and logging. Silent failures are worse than no automation.
- **Permissions**: Ensure the script has necessary permissions (file access, API keys).
- **Idempotency**: Running the script twice should not cause problems (duplicate data, double notifications).
- **Monitoring**: Set up alerts for automation failures. An unnoticed broken automation is worse than manual work.

## Verification
- Run the automation manually and verify the output
- Check that the schedule is set up correctly
- Verify that error handling works by simulating a failure
- Confirm that notifications are sent on failure
