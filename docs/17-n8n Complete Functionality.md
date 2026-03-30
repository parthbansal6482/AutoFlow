# n8n — Complete Functionality Reference
# Ordered by Implementation Priority

This document lists every single feature and capability that n8n has, organized into
priority tiers. Use this as the master checklist when building the Workflow Automation
platform. Each feature includes what it does, why it matters, and implementation notes.

---

## How to read this document

- **Priority 1** — Without these, the product does not work at all. Build first.
- **Priority 2** — Core product experience. Users expect these from day one.
- **Priority 3** — Power user features. Needed to handle real-world workflows.
- **Priority 4** — Enterprise and scaling features. Build when the core is solid.
- **Priority 5** — Nice-to-have polish, integrations, and advanced capabilities.

---

---

# PRIORITY 1 — Foundation (Product cannot function without these)

---

## 1.1 Workflow Canvas

### Drag and drop node placement
Users drag a node from the palette onto the canvas to add it to a workflow.
The node appears at the drop position with default parameter values.
- Snap to grid (optional, toggleable)
- Drop from sidebar palette
- Double-click canvas to open quick-add search

### Node connection (edge drawing)
Users click and drag from an output port of one node to an input port of another.
A bezier curve edge is drawn between them. This defines the data flow path.
- Output ports are on the right side of a node
- Input ports are on the left side
- A port can only accept one incoming connection (for main inputs)
- An output port can fan out to multiple downstream nodes
- Connection snaps to nearest valid input port when released

### Node deletion
- Click to select a node, press Backspace/Delete to remove it
- When a node is deleted, all its connections are also deleted
- Multi-select and delete

### Edge deletion
- Click an edge to select it, press Backspace/Delete to remove it
- Right-click an edge for a context menu with a Delete option

### Canvas pan
- Click and drag the empty canvas background to pan
- Middle-mouse-button drag to pan
- Keyboard: arrow keys to nudge pan position

### Canvas zoom
- Scroll wheel to zoom in/out
- Pinch-to-zoom on trackpad
- Zoom in/out buttons in the controls panel
- "Fit to screen" button — zooms and pans so all nodes are visible
- Reset zoom to 100%
- Zoom range: ~10% to 200%

### Node selection
- Click a node to select it (highlights with a border)
- Click empty canvas to deselect
- Shift+click to add/remove nodes from selection
- Click and drag on empty canvas to draw a selection rectangle (select all nodes inside)
- Ctrl/Cmd+A to select all nodes

### Multi-node move
- Select multiple nodes and drag them together as a group
- Connections between selected nodes move with them

### Minimap
- A small overview in the corner showing the full workflow layout
- A viewport rectangle shows what area the main canvas is currently showing
- Click/drag the minimap to navigate

### Undo / Redo
- Ctrl/Cmd+Z to undo the last action (add node, delete node, move node, change connection, etc.)
- Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo
- History stack of at least 50 actions

### Copy / Paste nodes
- Ctrl/Cmd+C to copy selected node(s)
- Ctrl/Cmd+V to paste — nodes appear offset from the originals
- Preserves all parameter values
- Does not paste connections to nodes outside the selection

### Duplicate node
- Right-click → Duplicate, or keyboard shortcut
- Creates a copy of the node with all parameters, placed slightly offset

### Node search / quick add
- Press Tab or N on the canvas to open a search dialog
- Type to filter all node types by name or category
- Arrow keys to navigate results, Enter to place the node

### Keyboard shortcuts panel
- A panel (? or Cmd+/) that shows all keyboard shortcuts

---

## 1.2 Workflow Execution Engine

### Manual execution
- A "Run" or "Execute Workflow" button in the editor toolbar
- Executes the workflow immediately starting from the trigger node
- Shows live status while running

### Execution status indicators
- Each node on the canvas shows its status during/after a run:
  - Grey: not yet run
  - Orange spinner: currently running
  - Green checkmark: completed successfully
  - Red X: failed with an error

### Data passing between nodes
- The output of each node becomes the input of the next
- Data is structured as an array of items: `[{ json: {...} }, { json: {...} }]`
- Each item flows through the workflow independently

### Sequential node execution
- Nodes execute in the order defined by connections
- A node does not start until all its upstream nodes have completed

### Execution result inspection
- After a run, click any node to see:
  - Input data (what it received)
  - Output data (what it produced)
  - Execution time
  - Any error message
- Data is shown as a formatted JSON tree

### Error handling — stop on error
- Default behavior: if a node throws an error, the execution stops
- The execution is marked as 'error'
- The failed node is highlighted in red on the canvas

### Execution log / history
- Every run is recorded in the database
- List of all past executions with: date, status, trigger type, duration
- Click a past execution to re-inspect the input/output data of each node

---

## 1.3 Trigger System

### Manual trigger node
- A special node that has no automatic firing mechanism
- Execution only starts when the user clicks "Run" in the editor
- Every workflow must have at least one trigger node

### Webhook trigger node
- Generates a unique webhook URL for the workflow
- When an external service POSTs to that URL, the workflow runs
- The request body, headers, and query params are available as input data
- Supports GET and POST methods
- Two modes:
  - **Test mode**: waits for one webhook hit while the editor is open
  - **Production mode**: fires every time the URL is called

### Schedule / Cron trigger node
- Runs the workflow on a time-based schedule
- Accepts standard 5-field cron expressions (e.g. `0 9 * * 1-5`)
- Also offers a simple UI for: every N minutes, hourly, daily, weekly, monthly
- Timezone selection per workflow
- The node shows the next scheduled execution time

---

## 1.4 Core Data Transformation Nodes

### Set node
- Add new fields to every item
- Update the value of existing fields
- Delete fields from items
- Each field can be set to: a fixed value, or an expression referencing input data
- Mode options: "Keep all other fields" or "Keep only set fields"

### IF node
- Evaluates a condition against each item
- Routes items to the `true` output or `false` output based on the result
- Condition types: string equals, string contains, number greater than, boolean is true, etc.
- Multiple conditions with AND / OR logic

### Switch node
- Routes items to one of N output branches based on a value
- Each branch has a rule (e.g. "if status equals 'active'")
- One "fallback" branch for items that match no rule
- Up to N configurable output branches

### Merge node
- Combines data from multiple upstream branches into one stream
- Merge modes:
  - **Append**: items from branch 1, then items from branch 2
  - **Merge by index**: pairs item 1 from branch 1 with item 1 from branch 2
  - **Merge by key**: joins items where a specified field value matches
  - **Multiplex**: cross product of both input arrays

### Code node (JavaScript)
- An embedded Monaco code editor
- User writes a JavaScript function body
- Has access to:
  - `$input.all()` — all input items
  - `$input.first()` — first input item
  - `$input.item` — current item (in loop mode)
  - `$now` — current datetime
  - `$workflow` — workflow metadata
- Must return an array of items
- Errors in the code are caught and reported

### Function Item node (legacy)
- Older version of the Code node
- Runs the code once per item instead of once for all items
- Kept for backwards compatibility

### Edit Fields node
- Dot-notation field mapping UI
- Map input fields to output fields with optional transformations
- No code required — pure UI mapping

---

## 1.5 Workflow Persistence

### Save workflow
- Ctrl/Cmd+S to save
- "Save" button in toolbar
- Workflow is saved to the database as JSON
- Save creates a new version in the version history

### Auto-save
- Optionally auto-saves every N seconds
- Indicator in the toolbar showing "Saved" or "Unsaved changes"

### Workflow name
- Editable name in the toolbar
- Defaults to "My Workflow" for new workflows

### Workflow active / inactive toggle
- A toggle in the toolbar to activate or deactivate the workflow
- Active workflows respond to webhook and schedule triggers
- Inactive workflows only run when manually triggered

---

## 1.6 Authentication

### Email + password registration
- Sign up with email and password
- Email confirmation required

### Email + password login
- Login form
- "Remember me" option
- Forgot password / reset password flow

### Session management
- JWT-based sessions
- Auto-refresh when token expires
- "Sign out" clears the session

---

---

# PRIORITY 2 — Core Product Experience

---

## 2.1 HTTP Request Node (Full)

The most-used action node. Needs full implementation.

### Methods
- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

### URL
- Static URL or expression-based dynamic URL
- e.g. `https://api.example.com/users/{{ $json.userId }}`

### Authentication types
- None
- Basic auth (username + password)
- Bearer token (static or from credential)
- Header auth (custom header name + value)
- OAuth2 (via stored credential)
- API key (query param or header)
- Digest auth

### Request body types
- JSON
- Form data (URL-encoded)
- Multipart form data (file uploads)
- Raw text / XML
- Binary

### Headers
- Add custom headers
- Reference expressions in header values

### Query parameters
- Add query params as key-value pairs

### Response handling
- Parse JSON response automatically
- Return raw text
- Return binary data (base64)
- Response code validation (error if not 2xx)
- Follow redirects (toggle)

### Pagination support
- Automatically paginate through multiple pages:
  - Offset/limit pagination
  - Cursor pagination
  - Link header pagination
- Max pages limit

### Retry on failure
- Configurable retry count
- Configurable wait between retries

### Timeout
- Set a request timeout in milliseconds

---

## 2.2 Expressions / Templating System

Expressions let users reference data from previous nodes and inject dynamic values
into node parameters. This is the core power of workflow automation.

### Expression syntax
- Uses `{{ }}` double-curly-brace syntax
- Inside expressions: full JavaScript is supported
- e.g. `{{ $json.firstName + ' ' + $json.lastName }}`

### Built-in variables
- `$json` — the current item's JSON data
- `$binary` — the current item's binary data
- `$input` — access to all items from the previous node
- `$node['Node Name'].json` — access output of a specific named node
- `$node['Node Name'].context` — node execution context
- `$workflow.id` — current workflow ID
- `$workflow.name` — current workflow name
- `$execution.id` — current execution ID
- `$execution.resumeUrl` — URL to resume a waiting workflow
- `$now` — current datetime as a Luxon DateTime object
- `$today` — today's date
- `$env.MY_VAR` — access environment variables
- `$vars.MY_VAR` — access workflow-level variables

### Expression editor
- Inline expression editor in parameter fields
- Syntax highlighting in the expression input
- Autocomplete for `$json.` fields based on the previous node's sample output
- Live preview of the expression result using sample data
- Toggle between expression mode and fixed value mode

### Built-in helper functions (available in expressions)
- String: `$json.name.toUpperCase()`, `.toLowerCase()`, `.trim()`, `.split()`, `.replace()`
- Array: `.length`, `.filter()`, `.map()`, `.find()`, `.includes()`
- Math: `Math.round()`, `Math.max()`, `Math.min()`, `Math.abs()`
- Date: `$now.toISO()`, `$now.plus({ days: 1 })`, `$now.toFormat('yyyy-MM-dd')`
- JSON: `JSON.stringify()`, `JSON.parse()`

---

## 2.3 Credential Management (Full)

### Credential types supported
- API Key (header or query param)
- Basic Auth (username + password)
- Bearer Token
- OAuth2 (authorization code flow)
- HTTP Header Auth (custom name + value)
- Digest Auth
- AWS credentials (access key + secret)
- Database credentials (host, port, user, password, db name)
- SMTP credentials (host, port, user, password, TLS)
- SSH credentials

### Credential creation UI
- Form that changes fields based on the selected credential type
- Test credential button — makes a test API call to verify the credential works
- Name the credential for easy reference

### Credential assignment to nodes
- Dropdown in the node config panel filtered by compatible credential type
- "Create new credential" option inline

### OAuth2 flow
- "Connect" button opens a popup to the OAuth provider
- Handles the authorization code exchange
- Stores access + refresh tokens encrypted
- Auto-refreshes the access token when it expires

### Credential sharing (workspace level)
- Credentials belong to a workspace and can be shared with other workspace members
- Owner can control who can use vs. edit a credential

---

## 2.4 Workflow Dashboard

### Workflow list
- Grid or list view of all workflows
- Shows: name, active status, last execution status, last execution time, created date
- Sort by: name, date created, date modified, last run

### Search workflows
- Search by workflow name

### Filter workflows
- Filter by: active/inactive, last execution status

### Create new workflow
- Button to create a blank workflow
- Opens the editor with an empty canvas and a default Manual Trigger node

### Duplicate workflow
- Creates a copy of the workflow with a new name
- Useful as a template for similar workflows

### Delete workflow
- Confirmation dialog before deleting
- Deleting a workflow also deletes all its execution history

### Import workflow from JSON
- Paste or upload a workflow JSON file
- The workflow is created from the JSON definition

### Export workflow to JSON
- Download the workflow as a JSON file
- Can be imported into another n8n instance or shared

### Workflow tags
- Add tags to workflows for organization
- Filter the workflow list by tag

---

## 2.5 Execution History Page

### List all executions
- Table of all executions across all workflows
- Columns: workflow name, trigger type, status, start time, duration

### Filter executions
- Filter by: workflow, status (success/error/running), date range, trigger type

### Execution detail view
- Click an execution to see:
  - Which nodes ran
  - Status of each node
  - Input/output data for each node (same as the editor inspection view)
  - Total duration
  - Error details if failed

### Re-run an execution
- Button to re-run a past execution with the same trigger data

### Delete execution records
- Delete individual execution records
- Bulk delete (e.g. "delete all executions older than 30 days")

---

## 2.6 Node Config Panel

### Dynamic form generation
- The config panel reads the node's `parameters` definition and renders the appropriate form fields
- No hardcoded forms — adding a new node type automatically works

### Field types rendered
- Text input (single line)
- Textarea (multi-line)
- Number input
- Toggle / checkbox (boolean)
- Select / dropdown (options list)
- Multi-select
- Key-value pair editor (for headers, query params, etc.)
- JSON editor with syntax highlighting and validation
- Code editor (Monaco) for Code nodes
- Credential picker dropdown
- Color picker (for some UI nodes)
- Date/time picker

### Expression toggle per field
- Every text field has a toggle to switch between "fixed value" and "expression" mode
- In expression mode: the field becomes an expression editor with autocomplete

### Field description tooltips
- Each parameter has a description shown as a tooltip on hover

### Collapsible sections
- Parameters can be grouped into collapsible sections (e.g. "Optional" section)

### Node name editing
- Editable node name at the top of the config panel
- Double-click the node on the canvas to edit the name inline

### Node notes
- A "Notes" field per node for adding plain text documentation
- Notes are shown on the canvas as a small note icon

---

---

# PRIORITY 3 — Power User Features

---

## 3.1 Advanced Node Types

### Split In Batches node
- Takes an array of items and splits it into smaller batches
- Useful for processing large datasets without hitting API rate limits
- Configure batch size
- Loops through all batches automatically

### Wait node
- Pauses workflow execution for a specified duration
- Wait modes:
  - Fixed time (e.g. wait 5 minutes)
  - Until a specific datetime
  - Until a webhook is received at a resume URL
- The resume URL is available via `$execution.resumeUrl`

### Loop Over Items node
- Explicitly loops through all input items one by one
- Replaces the implicit per-item behavior in some contexts
- Has "Loop" and "Done" output branches

### Stop and Error node
- Intentionally stops the workflow and marks it as failed
- Configure a custom error message
- Useful for validation checks

### No-Op node (Do Nothing)
- Passes input data through unchanged
- Useful as a placeholder or for organizing the canvas visually

### Respond to Webhook node
- Used inside a workflow triggered by a Webhook node
- Sends an HTTP response back to the caller immediately
- Configure: status code, response body, headers
- Without this node, the webhook call waits until the workflow finishes

### Execute Workflow node
- Calls another workflow and waits for it to complete
- Passes data in and receives the output data back
- Enables workflow composition and reuse

### Execute Workflow Trigger node
- The trigger node for a workflow that is called by "Execute Workflow"
- Receives the data passed in from the parent workflow

### HTTP Response node
- Sends custom HTTP responses for webhook-triggered workflows

---

## 3.2 Data Manipulation Nodes

### Filter node
- Keeps only items that match a condition
- Items that don't match are discarded
- Similar to IF node but only has one output (matched items)

### Sort node
- Sorts items by one or more field values
- Sort direction: ascending or descending
- Sort by multiple fields (first by A, then by B)

### Limit node
- Keeps only the first N items
- Discards the rest

### Remove Duplicates node
- Removes duplicate items based on a field value
- Comparison modes: exact match, case-insensitive

### Aggregate node
- Aggregates multiple items into one summary item
- Aggregation modes:
  - Count items
  - Sum a numeric field
  - Average a numeric field
  - Min / Max of a numeric field
  - Concatenate string values
  - Group by a field and aggregate each group

### Rename Keys node
- Renames field names on items
- e.g. rename `firstName` to `first_name`

### Date & Time node
- Parse a date string into a standardized format
- Format a date for output (e.g. `DD/MM/YYYY`)
- Add/subtract time from a date
- Get the difference between two dates
- Convert timezones
- Get current date/time

### Crypto node
- Hash a string: MD5, SHA1, SHA256, SHA512
- HMAC sign a string
- Generate random bytes
- Base64 encode/decode
- AES encrypt/decrypt

### HTML node
- Extract data from HTML using CSS selectors
- Parse HTML string into structured data
- Convert HTML to Markdown

### Markdown node
- Convert Markdown to HTML
- Convert HTML to Markdown

### XML node
- Parse XML string into JSON
- Convert JSON to XML string

### CSV node
- Parse CSV string into an array of items
- Convert items to CSV string
- Configure: delimiter, header row, quote character

### RSS Read node
- Fetch and parse an RSS or Atom feed
- Returns items with title, link, description, publication date

### Compression node
- Compress files/data: gzip, zip
- Decompress: gzip, zip
- List contents of a zip file

### Move Binary Data node
- Move binary data between the `binary` and `json` properties
- Convert binary data to base64 string
- Convert base64 string back to binary

### Extract From File node
- Extract text content from: PDF, Word (.docx), spreadsheet (.xlsx/.csv), text files

### Convert To File node
- Convert JSON items to: CSV, Excel (.xlsx), JSON file, text file, HTML

### Compare Datasets node
- Compare two input datasets
- Outputs: only in A, only in B, in both (intersection), all items
- Compare by a specified key field

---

## 3.3 Sub-workflows and Workflow Organization

### Execute Workflow node (full)
- Call another workflow synchronously (wait for it to finish)
- Pass arbitrary data in as input
- Receive the output of the called workflow
- Error handling: stop parent on child error, or continue

### Workflow variables
- Key-value pairs defined at the workflow level
- Accessible in all nodes via `$vars.MY_VAR`
- Different from environment variables — per-workflow scope

### Sticky notes
- Non-functional canvas elements for documentation
- Add text notes directly on the canvas
- Resize, recolor, move
- Used to annotate sections of a complex workflow

### Node grouping / visual containers
- Group related nodes together with a visual container
- Label the container
- Collapse/expand the group

---

## 3.4 Error Handling (Advanced)

### Error workflow
- Configure a separate "error workflow" per workflow (in workflow settings)
- When the main workflow fails, the error workflow is automatically triggered
- The error workflow receives: error message, node that failed, execution ID, workflow name

### Continue on error (per node)
- Toggle on a node: "Continue on Error"
- If enabled: when the node errors, the error is passed to the next node as data
  instead of stopping execution
- Allows custom error handling logic in the workflow

### Retry on failure (per node)
- Configure a node to automatically retry N times before giving up
- Configurable wait time between retries (fixed or exponential backoff)

### Error output branch (per node)
- Some nodes have an "Error" output port in addition to the main output
- If the node errors, items flow to the Error output for custom handling
- Allows the workflow to gracefully handle partial failures

### Try / Catch pattern
- Connect an Error-output-capable node to a handler subgraph
- The handler receives the error details and can: log them, send a notification,
  transform and retry, etc.

---

## 3.5 Workflow Settings Panel

### Workflow timezone
- Set the timezone for cron schedule interpretation
- Defaults to the system/account timezone

### Error workflow
- Link to another workflow that runs on failure
- Dropdown picker from existing workflows

### Execution policy
- Save successful executions: yes/no
- Save failed executions: yes/no
- Save manual executions: yes/no
- (Saving all executions on busy workflows uses a lot of storage)

### Timeout
- Maximum execution time before the workflow is forcibly stopped
- Default: no timeout

### Retry on failure (workflow level)
- Max number of automatic retry attempts for the whole workflow
- Retry delay

### Workflow ID and creation date
- Read-only display of internal metadata

---

## 3.6 Version Control / Workflow History

### Version history
- Every save creates a new version
- List of all saved versions with: timestamp, user who saved
- View the diff between two versions (which nodes/parameters changed)
- Restore a previous version

### Workflow locking
- Lock a workflow to prevent edits (useful in team environments)
- Only the owner or an admin can unlock it

---

## 3.7 Built-in Integration Nodes — Tier 1 (most commonly used)

Each of these is a dedicated node with full credential management and pre-built
operations. They should be implemented as soon as the core is stable.

### Slack
- Send message to channel
- Send direct message to user
- Update a message
- Delete a message
- Get channel list
- Get user list
- Upload file
- React to a message
- Create a channel
- Invite user to channel

### Gmail / Google Mail
- Send email
- Get email (by ID or search query)
- List emails (inbox, sent, label)
- Reply to email
- Forward email
- Mark as read/unread
- Add/remove label
- Move to trash
- Get attachments

### Google Sheets
- Read rows
- Append rows
- Update rows
- Delete rows
- Create spreadsheet
- Clear a sheet
- Get sheet metadata

### Google Drive
- Upload file
- Download file
- List files / folders
- Create folder
- Move file
- Delete file
- Share file (set permissions)
- Copy file
- Search files

### Google Calendar
- Create event
- Get event
- Update event
- Delete event
- List events (by date range)
- Get calendar list

### Notion
- Create page
- Get page
- Update page
- Archive page
- Create database entry
- Query database
- Get database
- Get block children
- Append block children

### Airtable
- Get record
- List records (with filters)
- Create record
- Update record
- Delete record
- Search records

### GitHub
- Create issue
- Update issue
- Get issue
- List issues
- Create pull request
- Get pull request
- List pull requests
- Create release
- Get repository
- List repositories
- Create/update file
- Get file content
- Create comment
- List commits

### Postgres
- Execute a SQL query
- Insert rows
- Update rows
- Delete rows
- Select rows
- Execute stored procedure

### MySQL
- Same operations as Postgres above

### MongoDB
- Find documents
- Insert documents
- Update documents
- Delete documents
- Aggregate pipeline
- Count documents

### Redis
- Get value
- Set value
- Delete key
- Publish to channel
- Subscribe to channel
- Execute raw command
- Get all keys matching a pattern

### Stripe
- Create customer
- Get customer
- Create payment intent
- Get payment intent
- Create subscription
- Cancel subscription
- List invoices
- Create refund
- Retrieve balance

### Typeform
- Get form
- List forms
- Get response
- List responses (with date filter)

### HubSpot
- Create contact
- Get contact
- Update contact
- Delete contact
- Create deal
- Update deal
- Create company
- Add contact to list
- Get all contacts

### Salesforce
- Create record (any object)
- Get record
- Update record
- Delete record
- Query (SOQL)
- List fields of an object

### Jira
- Create issue
- Get issue
- Update issue
- Delete issue
- Transition issue (change status)
- Add comment
- List issues (JQL query)
- Get project
- List projects

### Trello
- Create card
- Get card
- Update card
- Move card to list
- Add member to card
- Create checklist item
- Get board lists
- List cards in list

### Asana
- Create task
- Get task
- Update task
- Delete task
- List tasks (by project or assignee)
- Create project
- Add followers to task

### Discord
- Send message to channel
- Send direct message
- Get channel
- Create channel
- Delete message
- Get guild members
- Assign role to member

### Telegram
- Send message
- Send photo
- Send document
- Send poll
- Edit message
- Delete message
- Get updates (webhook mode)
- Reply to message

### Twitter / X
- Create tweet
- Delete tweet
- Like tweet
- Retweet
- Search tweets
- Get user by username
- Follow user

### LinkedIn
- Create post
- Delete post
- Get profile

### SendGrid
- Send email
- Send email (with template)
- Add contact to list
- Remove contact
- Create contact

### Mailchimp
- Add subscriber
- Update subscriber
- Remove subscriber
- Get campaign
- List campaigns
- Create campaign

### Twilio
- Send SMS
- Make voice call
- Send WhatsApp message

### OpenAI
- Message (chat completion)
- Complete (legacy text completion)
- Summarize
- Generate image (DALL-E)
- Transcribe audio (Whisper)
- Classify text
- Moderate content
- Create embedding

### Anthropic (Claude)
- Message (chat completion)
- Generate with system prompt
- Stream response

### AWS S3
- Upload file
- Download file
- List objects
- Delete object
- Copy object
- Get object metadata
- Create presigned URL

### AWS SES
- Send email
- Send raw email

### AWS SNS
- Publish message to topic
- Create topic

### AWS SQS
- Send message
- Receive messages
- Delete message

### Dropbox
- Upload file
- Download file
- List folder
- Move file
- Delete file
- Share file

### Box
- Upload file
- Download file
- List folder
- Move item
- Create folder
- Get file metadata

### Shopify
- Get product
- List products
- Create product
- Update product
- Get order
- List orders
- Create order
- Update order status
- Get customer
- Create customer

### WooCommerce
- Get order
- List orders
- Update order
- Get product
- List products
- Create product

### Zendesk
- Create ticket
- Get ticket
- Update ticket
- List tickets
- Add comment to ticket
- Get user
- Create user

### Intercom
- Create contact
- Update contact
- Get conversation
- Send message
- Create note on contact

### Pipedrive
- Create deal
- Update deal
- Get deal
- Create person
- Update person
- Create activity
- List deals

### Calendly
- Get event type
- List event types
- Get scheduled event
- List scheduled events
- Cancel event

### Zoom
- Create meeting
- Get meeting
- Update meeting
- Delete meeting
- List meetings
- Get meeting participants
- Create webinar

### Webhook (Generic Trigger)
Full implementation already described in Priority 1. Additional features:
- Custom response body and status code
- Webhook authentication (Basic auth, Header auth, JWT validation)
- Webhook path customization

### Email (IMAP)
- Connect to any email server via IMAP
- Trigger on new email
- Mark as read
- Move to folder
- Delete email

### Email (SMTP)
- Send email via any SMTP server
- Attachments support
- HTML email body
- CC / BCC

### FTP / SFTP
- Upload file
- Download file
- List files in directory
- Delete file
- Move/rename file
- Create directory

### SSH
- Execute command on remote server
- Stream output back

---

---

# PRIORITY 4 — Enterprise and Scaling Features

---

## 4.1 User Management and Teams

### Multiple users per instance
- Each user has their own account and data
- Separate login per user

### Workspaces / Organizations
- Group users into a workspace
- Shared workflows and credentials within a workspace
- A user can belong to multiple workspaces

### Roles and permissions
- **Owner** — full control, billing, can delete workspace
- **Admin** — manage users, all workflows, all credentials
- **Member** — create and manage own workflows and credentials
- **Viewer** — read-only access (can see but not edit or run)

### Inviting users
- Invite by email address
- Invitation email with a sign-up link
- Pending invitation management

### Removing users
- Remove a user from a workspace
- Optionally transfer their workflows to another user

### Personal vs shared workflows
- Workflows can be personal (only owner can see/edit) or shared (whole workspace)

---

## 4.2 Environment Variables and Global Configuration

### Environment variables (instance-level)
- Key-value pairs set in the admin panel or via config file
- Accessible in workflows via `$env.MY_VAR`
- Useful for: API base URLs, feature flags, environment-specific config
- Values are NOT encrypted (use credentials for secrets)

### Global secrets (encrypted)
- Like environment variables but encrypted at rest
- Accessible in workflows via `$env.MY_VAR` (same syntax but stored differently)
- Suitable for shared API keys used across many workflows

---

## 4.3 Execution Queue and Worker Scaling

### Execution queue
- All workflow executions go through a queue
- Workers pull from the queue and execute workflows
- Allows horizontal scaling (add more workers = more parallel executions)

### Worker processes
- Multiple worker processes can run in parallel
- Each worker handles one execution at a time (or N concurrent executions)
- Workers can be on separate machines

### Concurrency limits
- Set max concurrent executions per workflow
- Set max concurrent executions globally
- Queue excess executions for later

### Execution priority
- Some executions can be prioritized over others in the queue

### Queue monitoring
- Admin panel showing: queue depth, active executions, worker status

---

## 4.4 Workflow Activation at Scale

### Bulk activate / deactivate
- Activate or deactivate multiple workflows at once from the dashboard

### Activation error handling
- If a workflow fails to activate (e.g. webhook registration fails), show a clear error
- List all activation errors in the admin panel

---

## 4.5 Audit Logs

### User action log
- Record every significant user action: login, workflow create/edit/delete/activate,
  credential create/delete, user invite/remove
- Show: who, what, when, from which IP

### Execution audit
- Every workflow execution is logged regardless of save settings
- Useful for compliance and debugging

### Audit log export
- Export audit logs as CSV for compliance requirements

---

## 4.6 Single Sign-On (SSO)

### SAML 2.0
- Integrate with enterprise identity providers (Okta, Azure AD, OneLogin, etc.)
- Users log in via the company's SSO instead of a password

### LDAP / Active Directory
- Authenticate users against a corporate LDAP directory
- Sync group memberships to workspace roles

### OAuth2 / OIDC
- Generic OAuth2/OIDC integration for SSO with any compatible provider

---

## 4.7 API Access

### Public REST API
- Manage workflows via API (create, read, update, delete, activate)
- Trigger workflow executions via API
- List executions and their status
- Manage credentials via API

### API key management
- Generate personal API keys in account settings
- List and revoke API keys

---

## 4.8 Webhook Management

### Webhook URL rotation
- Regenerate a workflow's webhook URL (old URL stops working)
- Useful if a webhook URL has been exposed

### Webhook testing in editor
- "Listen for test event" button waits for an incoming webhook
- Shows the received data in the editor for immediate inspection

---

## 4.9 Performance and Storage

### Execution data pruning
- Automatically delete execution records older than N days
- Configure per workflow or globally
- Keep only the last N executions per workflow

### Binary data storage configuration
- Store binary data: in the database, on filesystem, or in S3-compatible object storage
- S3 storage is recommended for large binary files at scale

### Execution data compression
- Compress execution input/output data at rest to save storage

---

## 4.10 Deployment and Configuration

### Config file support
- Configure the entire instance via a config file (`config.json` or environment variables)
- All settings overridable via environment variables for Docker/Kubernetes deployments

### Docker support
- Official Docker image
- Docker Compose setup for local development
- Kubernetes helm chart

### Health check endpoint
- `GET /healthz` returns 200 OK if the instance is running
- Used by load balancers and orchestration systems

### Graceful shutdown
- Workers finish in-flight executions before shutting down
- Queue is not lost on shutdown

---

---

# PRIORITY 5 — Advanced Capabilities and Polish

---

## 5.1 AI / LLM Features (n8n AI Nodes)

### AI Agent node
- A node that can autonomously decide which tools/nodes to call
- Given a prompt and a set of available tools, the LLM decides what to do
- Iterates until it has a final answer
- Tools available to the agent: any connected node

### Chat Trigger node
- A public chat interface URL that triggers the workflow
- Each message from the user runs the workflow
- Maintains conversation history across messages

### AI Memory nodes
- **Simple Memory** — keeps conversation history in memory for a session
- **Window Buffer Memory** — keeps last N messages in memory
- **Postgres Chat Memory** — persists conversation history in Postgres
- **Redis Chat Memory** — persists conversation history in Redis
- **Zep Memory** — uses Zep for long-term memory with semantic search

### AI Tool nodes (used by agents)
- **Calculator** — performs math
- **Code** — runs generated code
- **HTTP Request** — makes API calls
- **Wikipedia** — searches Wikipedia
- **Wolfram Alpha** — queries Wolfram Alpha
- **SerpAPI** — performs web searches
- **Think** — makes the LLM reason before responding (chain-of-thought)
- **Vector Store** — queries a vector database
- **Workflow** — calls another n8n workflow as a tool

### Document loaders (for RAG workflows)
- **Binary Input Loader** — loads binary data (PDF, Word, etc.)
- **CSV Loader** — loads CSV files
- **PDF Loader** — loads and parses PDFs
- **JSON Loader** — loads JSON files
- **Git Loader** — loads files from a git repository
- **HTML Loader** — loads and parses HTML
- **Notion Loader** — loads Notion pages

### Text splitters (for RAG)
- **Character Text Splitter** — splits by character count
- **Recursive Character Text Splitter** — intelligently splits by paragraphs/sentences
- **Token Text Splitter** — splits by token count

### Embeddings nodes
- **OpenAI Embeddings** — generate embeddings via OpenAI
- **Azure OpenAI Embeddings**
- **Google Vertex AI Embeddings**
- **Mistral Embeddings**
- **Cohere Embeddings**
- **Hugging Face Embeddings**

### Vector store nodes
- **In-Memory Vector Store** — for testing, not persistent
- **Pinecone** — read/write to Pinecone
- **Qdrant** — read/write to Qdrant
- **Supabase Vector Store** — read/write to pgvector in Supabase
- **Weaviate** — read/write to Weaviate
- **Chroma** — read/write to Chroma
- **Milvus** — read/write to Milvus

### LLM chain node
- Simple prompt → LLM → output chain
- Configure: system prompt, user message (with expressions), LLM model

### Summarization chain node
- Summarize long documents that don't fit in a single context window
- Methods: stuff (one shot), map-reduce, refine

### Question and Answer chain node
- Answer a question based on retrieved context
- Takes a question and context documents as input
- Returns the answer

---

## 5.2 Advanced Trigger Nodes

### Email trigger (IMAP)
- Polls an email inbox via IMAP
- Triggers when a new email arrives
- Filter by: subject contains, from address, label/folder

### GitHub trigger (webhook)
- Triggers on GitHub events: push, pull request, issue, release, etc.
- Automatic webhook registration when workflow is activated

### GitLab trigger (webhook)
- Same as GitHub but for GitLab

### Jira trigger (webhook)
- Triggers on Jira events: issue created, updated, transitioned, deleted

### Notion trigger (polling)
- Polls a Notion database for new or updated entries

### Airtable trigger (polling)
- Polls an Airtable base for new or updated records

### Typeform trigger (webhook)
- Triggers when a Typeform form is submitted

### Shopify trigger (webhook)
- Triggers on Shopify events: new order, order fulfilled, new customer, etc.

### Stripe trigger (webhook)
- Triggers on Stripe events: payment succeeded, subscription created, etc.

### WooCommerce trigger (webhook)
- Triggers on WooCommerce events: new order, order completed, etc.

### Google Sheets trigger (polling)
- Triggers when new rows are added to a Google Sheet

### Calendly trigger (webhook)
- Triggers when a meeting is booked or cancelled

### Form trigger (built-in form)
- Generates a hosted form URL
- Users fill in the form
- Form submission triggers the workflow
- No external form tool needed

### Chat trigger (built-in chat)
- Generates a hosted chat interface
- User messages trigger the workflow
- Response is sent back to the chat
- Used with AI Agent nodes

### Local file trigger
- Watches a folder on the filesystem
- Triggers when a file is created, modified, or deleted

### Error trigger
- Triggers when another workflow fails
- Used as the error workflow for other workflows
- Receives: workflow name, error message, node that failed

---

## 5.3 Community Nodes

### Community node installation
- Install community-built nodes from npm (`n8n-nodes-*` packages)
- Admin can manage allowed community packages
- Community nodes appear in the node palette alongside built-in nodes

### Community node update
- Check for and apply updates to installed community nodes

### Community node removal
- Uninstall a community node
- Any workflows using that node type will show an error

---

## 5.4 Workflow Templates

### Template library
- Browse pre-built workflow templates in the app
- Templates are organized by category: Marketing, DevOps, HR, Sales, etc.
- Each template has a description and a list of required credentials

### Use a template
- Click "Use template" to create a new workflow pre-populated with the template nodes
- User still needs to add their own credentials

### Share a template
- Export any workflow as a shareable template JSON
- Import a template from JSON

### n8n template marketplace integration
- Browse templates from n8n's public template library (https://n8n.io/workflows)
- Import directly into the editor

---

## 5.5 Canvas UI Polish

### Node color coding
- Users can set a custom color on any node
- Helps visually organize complex workflows

### Node pinning
- Pin a node's output data so it always uses that data regardless of actual execution
- Useful for testing: pin an HTTP Request node's response and test downstream nodes
  without making real API calls every time

### Node disabling
- Disable a node without deleting it
- Disabled nodes are skipped during execution and appear greyed out
- Their connections are effectively bypassed (input passes directly to output)

### Canvas grid and alignment helpers
- Toggle grid display on the canvas
- Snap to grid toggle
- Alignment guides when moving nodes near others

### Dark mode
- Full dark theme for the canvas and all UI

### Canvas bookmark / named positions
- Save a specific canvas position and zoom level with a name
- Quickly jump between saved positions in a large workflow

---

## 5.6 Code Node Enhancements

### Python support
- Code node supports Python in addition to JavaScript
- Uses Pyodide (Python in WebAssembly) for sandboxed execution

### npm module access
- Allow importing specific npm modules inside the Code node
- Admin configures the allowed list of modules

### Code node AI assist
- "Generate code" button — describe what you want in plain English
- AI generates the JavaScript/Python code
- User can edit and refine before saving

---

## 5.7 Debugging Tools

### Pin node output
- As described above: freeze a node's output to specific test data

### Step-through execution
- Execute one node at a time
- Inspect data between each step
- Go back and re-run from a specific node with modified data

### Execution data replay
- Take the input data from a past failed execution and re-run just the failed node
- Tweak parameters without re-running the whole workflow

### Node output preview
- While configuring a node (before running), show a preview of what the output
  will look like using sample data from previous nodes

---

## 5.8 Monitoring and Observability

### Execution metrics
- Dashboard showing: executions per day, success rate, average duration, error rate
- Per-workflow metrics
- Per-node metrics (which nodes are slowest or most error-prone)

### Alerts
- Configure alerts for: workflow failure rate above N%, execution time above N seconds
- Alert delivery: email, Slack message, webhook

### System metrics
- CPU and memory usage of the n8n instance
- Queue depth and worker utilization
- Database storage usage

---

## 5.9 Localization and Accessibility

### Multi-language UI
- Interface translated into multiple languages
- Language selection in user settings

### Keyboard navigation
- Full keyboard navigation of the canvas and panels
- WCAG 2.1 AA accessibility compliance

### Right-to-left (RTL) support
- UI layout works for RTL languages (Arabic, Hebrew)

---

## 5.10 Mobile / Responsive

### Responsive dashboard
- The workflow list/dashboard is usable on a tablet or phone
- Create, delete, activate/deactivate workflows from mobile

### Read-only canvas on mobile
- View a workflow on a phone
- Cannot edit (canvas editing requires a large screen)

---

---

# Implementation Checklist

Use this checklist to track progress. Check off each item as it is completed.

## Priority 1 — Foundation
- [ ] 1.1 Workflow Canvas — drag/drop, connect, delete, pan, zoom, select, undo/redo, copy/paste
- [ ] 1.2 Workflow Execution Engine — manual run, node status, data passing, error stop, execution log
- [ ] 1.3 Trigger System — manual trigger, webhook trigger, cron trigger
- [ ] 1.4 Core Data Nodes — Set, IF, Switch, Merge, Code, Edit Fields
- [ ] 1.5 Workflow Persistence — save, auto-save, name, active toggle
- [ ] 1.6 Authentication — register, login, session, sign out

## Priority 2 — Core Experience
- [ ] 2.1 HTTP Request Node — all methods, auth types, body types, pagination, retry
- [ ] 2.2 Expressions System — syntax, built-in variables, editor with autocomplete, live preview
- [ ] 2.3 Credential Management — all types, OAuth2 flow, test button, workspace sharing
- [ ] 2.4 Workflow Dashboard — list, search, filter, create, duplicate, delete, import, export, tags
- [ ] 2.5 Execution History — list, filter, detail view, re-run, delete
- [ ] 2.6 Node Config Panel — all field types, expression toggle, tooltips, notes

## Priority 3 — Power User
- [ ] 3.1 Advanced Nodes — Split In Batches, Wait, Loop, Stop and Error, No-Op, Respond to Webhook, Execute Workflow
- [ ] 3.2 Data Manipulation Nodes — Filter, Sort, Limit, Remove Duplicates, Aggregate, Date/Time, Crypto, HTML, XML, CSV, Compression
- [ ] 3.3 Sub-workflows and Organization — Execute Workflow, workflow variables, sticky notes, grouping
- [ ] 3.4 Error Handling — error workflow, continue on error, retry per node, error output branch
- [ ] 3.5 Workflow Settings — timezone, error workflow, execution policy, timeout, retry
- [ ] 3.6 Version History — per-save versions, diff view, restore
- [ ] 3.7 Tier 1 Integration Nodes — Slack, Gmail, Google Sheets, Google Drive, Notion, Airtable, GitHub, Postgres, MySQL, MongoDB, Redis, Stripe, OpenAI, Anthropic, AWS S3, Shopify, Jira, Discord, Telegram, Twilio, SendGrid, HubSpot, Salesforce

## Priority 4 — Enterprise
- [ ] 4.1 User Management — multi-user, workspaces, roles, invitations
- [ ] 4.2 Environment Variables and Global Secrets
- [ ] 4.3 Execution Queue and Worker Scaling
- [ ] 4.4 Bulk Workflow Activation
- [ ] 4.5 Audit Logs
- [ ] 4.6 SSO — SAML, LDAP, OIDC
- [ ] 4.7 Public REST API and API keys
- [ ] 4.8 Webhook Management
- [ ] 4.9 Performance and Storage — pruning, binary data config, compression
- [ ] 4.10 Deployment — config file, Docker, health check, graceful shutdown

## Priority 5 — Advanced
- [ ] 5.1 AI Nodes — Agent, Chat Trigger, Memory, Tools, Document Loaders, Embeddings, Vector Stores
- [ ] 5.2 Advanced Trigger Nodes — Email IMAP, GitHub/GitLab/Jira/Notion/Airtable/Stripe/Shopify webhooks, Form trigger, Chat trigger
- [ ] 5.3 Community Nodes — install, update, remove npm community packages
- [ ] 5.4 Workflow Templates — library, use, share, marketplace
- [ ] 5.5 Canvas Polish — node colors, pinning, disabling, dark mode, bookmarks
- [ ] 5.6 Code Node Enhancements — Python, npm modules, AI assist
- [ ] 5.7 Debugging Tools — step through, replay, output preview
- [ ] 5.8 Monitoring — execution metrics, alerts, system metrics
- [ ] 5.9 Localization and Accessibility
- [ ] 5.10 Mobile / Responsive
