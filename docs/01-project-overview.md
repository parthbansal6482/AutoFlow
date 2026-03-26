# 01 — Project Overview

## What is this?

Workflow Automation is a visual workflow automation platform. It lets users build automated
processes by connecting blocks (called nodes) together on a drag-and-drop canvas. When a
workflow runs, data flows through each node in sequence — each node does something to the
data (fetch from an API, send an email, transform a value, check a condition) and passes
the result to the next node.

Think of it like n8n or Zapier, but built from scratch and self-hosted.

---

## What can users do?

- Build workflows visually by dragging nodes onto a canvas and connecting them
- Trigger workflows in three ways:
  - Manually (click a button)
  - Via webhook (an external service sends an HTTP request)
  - On a schedule (every hour, every day, etc.)
- Watch workflows execute in real time — see each node light up as it runs
- Store API keys and credentials securely (encrypted at rest)
- Connect to external services like Slack, Gmail, HTTP APIs, databases
- View full execution history with input/output data for every node

---

## Core concepts

### Workflow
A workflow is a directed graph of nodes. It has a name, a trigger, a series of action/logic
nodes, and connections between them. It is stored as JSON in the database.

### Node
A node is a single step in a workflow. Every node has:
- A type (e.g. `http-request`, `if`, `send-email`)
- A position on the canvas (x, y coordinates)
- Parameters (the configuration for that node — URL, method, condition, etc.)
- Input ports (where data comes in)
- Output ports (where data goes out)

### Connection
A connection is an edge between two nodes. It links an output port of one node to an
input port of another. This is how data flows through the workflow.

### Execution
An execution is a single run of a workflow. Every time a workflow runs, one execution
record is created. Inside that execution, one log entry is created per node that ran —
storing the input data, output data, status, and how long it took.

### Credential
A credential is a stored secret — an API key, OAuth token, username/password, etc.
Credentials are encrypted before storage and referenced by ID inside workflow nodes.
The raw secret is never stored in plaintext anywhere.

---

## Who is this for?

Developers and technical users who want to automate repetitive tasks and integrate
services without writing full backend code each time.

---

## What this is NOT

- Not a no-code tool for non-technical users (parameters use JSON and expressions)
- Not a managed SaaS — it is self-hosted
- Not a replacement for a full backend — it is a workflow layer on top of existing services
