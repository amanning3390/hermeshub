---
name: data-pipeline-builder
description: Build automated data pipelines for ETL (Extract, Transform, Load) workflows. Supports scheduled data collection, transformation, validation, and storage. Trigger when user wants to automate data collection, build ETL pipelines, schedule data jobs, or create data workflows.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [data-pipeline, ETL, automation, scheduling, data-engineering, workflow]
    category: data
---

# Data Pipeline Builder

## When to Use
- User wants to build an automated data pipeline (ETL)
- User asks to schedule regular data collection jobs
- User wants to transform and load data from one source to another
- User needs to automate data processing workflows
- User asks about data pipeline best practices

## Procedure

1. **Define the pipeline requirements**:
   - **Source**: Where does the data come from? (API, database, file, web scrape)
   - **Frequency**: How often should it run? (hourly, daily, weekly, on-demand)
   - **Transform**: What transformations are needed? (cleaning, aggregation, joining, filtering)
   - **Destination**: Where should the data go? (database, CSV, JSON, data warehouse)
   - **Volume**: How much data per run? (affects tooling choices)

2. **Design the pipeline architecture**:
   ```
   Source → Extract → Validate → Transform → Load → Verify
   ```

3. **Implement each stage**:

   **Extract**: Fetch data from the source. Handle:
   - API pagination
   - Rate limiting (add delays, respect limits)
   - Authentication (API keys, OAuth)
   - Error handling (retry on failure, max 3 attempts)

   **Validate**: Check data quality before processing:
   - Schema validation (expected columns/types)
   - Null/missing value checks
   - Duplicate detection
   - Range validation (dates in expected range, numbers within bounds)
   - Reject invalid records with logging

   **Transform**: Process the data:
   - Clean (remove whitespace, fix encoding)
   - Normalize (standardize formats, units, categories)
   - Aggregate (group by, sum, average, count)
   - Join (combine with other data sources)
   - Filter (remove irrelevant records)
   - Enrich (add computed columns, lookups)

   **Load**: Store the processed data:
   - Append mode (add new records to existing data)
   - Upsert mode (update existing, insert new)
   - Full refresh (replace all data)
   - Include metadata: load timestamp, record count, source reference

   **Verify**: Confirm the pipeline ran successfully:
   - Row count sanity check (within expected range)
   - Data freshness check (latest record is recent)
   - Schema check (output matches expected schema)

4. **Schedule the pipeline**:
   - Use cron for Linux/Mac scheduling
   - Use Task Scheduler for Windows
   - Use GitHub Actions schedule for cloud-based pipelines
   - Include error notification (email, Slack, or log file)

5. **Document the pipeline**: Create a README with: purpose, source, destination, schedule, dependencies, and troubleshooting steps.

## Examples

### Example 1: Daily price data pipeline
```
Input: "Build a pipeline that fetches daily crypto prices and saves to CSV"
Expected behavior: Create a Python script with extraction, validation, transformation, and loading stages, plus a cron schedule
```

### Example 2: API to database pipeline
```
Input: "Pull data from this REST API every hour and load it into SQLite"
Expected behavior: Build pipeline with hourly schedule, API fetching, data validation, and SQLite loading
```

## Pitfalls
- **Idempotency**: Pipelines should be safe to re-run without creating duplicates.
- **Error handling**: Always log errors and continue processing valid records.
- **Data lineage**: Track where data came from and when it was processed.
- **Resource management**: Close database connections, file handles, and HTTP sessions properly.

## Verification
- Run the pipeline manually and verify output
- Check that scheduled execution works (test with a short interval)
- Verify that re-running doesn't create duplicates
- Confirm error handling works by simulating a failure
