# AWS to GCP Migration Tool

**A comprehensive cloud migration tool for assessing, planning, and executing migrations from AWS to Google Cloud Platform (GCP).**

This tool provides a complete solution for organizations looking to migrate their workloads from AWS to GCP. It streamlines the entire migration process, from initial assessment to post-migration operations, ensuring a cost-effective and efficient transition.

## Key Features

### Assessment & Planning
*   **Cloud Workload Discovery:** Automatically discovers and inventories your existing AWS workloads.
*   **Dependency Visualization:** Provides an interactive map to visualize dependencies between your workloads.
*   **Migration Strategy Recommender:** Recommends the best migration strategy (based on the 6 R's) for each workload.
*   **Wave Planner:** Group workloads into migration waves to better plan and manage the migration process.

### Cost Management
*   **Cost Comparison Calculator:** Compares your current AWS costs with projected GCP costs.
*   **Cost Dashboard:** Monitor your multi-cloud costs in real-time with forecasting and budget alerts.
*   **Resource Optimization:** Get AI-powered recommendations to optimize your resource usage and reduce costs.

### Governance & Operations
*   **Policy Compliance:** Ensure your cloud environment adheres to your organization's governance policies.
*   **Executive Dashboard:** Provides a high-level overview of the migration progress for executive stakeholders.

## Architecture

The application is built using **Clean Architecture** (also known as Hexagonal Architecture), which separates the business logic from the technical implementation details. This results in a more maintainable, scalable, and testable application.

## Technology Stack

*   **Frontend:** React, Bootstrap
*   **Data Visualization:** Chart.js
*   **Testing:** Jest

## Target Audience

This tool is designed for:

*   **Cloud Engineers and Architects:** Who are planning and executing cloud migrations.
*   **IT Managers and CIOs:** Who are responsible for making decisions about cloud strategy and costs.
*   **DevOps Engineers:** Who are responsible for automating and managing cloud infrastructure.
