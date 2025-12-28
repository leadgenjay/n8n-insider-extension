# Builder Mode

Builder mode lets the AI create and modify workflows directly in your n8n instance. This is where N8N Insider becomes a true workflow copilot.

## Requirements

To use Builder mode:
1. [Connect your n8n instance](/docs/configuration/n8n-connection)
2. Enable Builder mode in Settings

## What the AI Can Do

### Workflow Management

**Create workflows**
```
User: Create a new workflow called "Email Notifications"

AI: Creating workflow "Email Notifications"...
    Done! Workflow created successfully.
    Refresh your n8n page to see it.
```

**Duplicate workflows**
```
User: Make a copy of this workflow

AI: Duplicating workflow...
    Created "My Workflow (Copy)"
```

**Activate/Deactivate workflows**
```
User: Activate this workflow

AI: Activating workflow...
    Done! Your workflow is now active.
```

### Node Operations

**Add nodes**
```
User: Add a Slack node to send a message

AI: Adding Slack node...
    Done! I've added a Slack node to your workflow.
    You'll need to configure the channel and credentials.
```

**Modify node settings**
```
User: Change the HTTP Request method to POST

AI: I'll update the HTTP Request node...
    Done! Method changed to POST.
```

**Add documentation notes**
```
User: Add a sticky note explaining what this section does

AI: Adding sticky note...
    Done! I've added a documentation note above your nodes.
```

### Safe vs Destructive Actions

Some actions execute immediately (safe):
- Creating workflows
- Adding nodes
- Activating/deactivating workflows
- Duplicating workflows

Other actions require your confirmation (destructive):
- Deleting workflows
- Deleting nodes
- Modifying existing node parameters

You'll see a confirmation dialog before any destructive action.

## Confirmation Dialog

For destructive actions, you'll see:
- What action will be performed
- Which workflow/node is affected
- Confirm or Cancel buttons

Example:
```
Delete Node
Are you sure you want to delete "HTTP Request"
from workflow "My Workflow"?

[Cancel] [Confirm]
```

## Tips for Builder Mode

**Be specific about placement**
```
Good: Add a Slack node after the IF node
Bad: Add a Slack node somewhere
```

**Name your nodes**
```
Good: Add an HTTP Request node called "Fetch User Data"
Bad: Add an HTTP request
```

**Reference visible nodes**
```
Good: Update the "Send Email" node to use my Gmail
Bad: Update the email node
```

## Viewing Changes

After the AI makes changes:

1. **Refresh your n8n page** to see updates
2. Node positions may need manual adjustment
3. New nodes may need credential configuration
4. Test your workflow before activating

## Switching Back to Helper Mode

If you prefer suggestions over direct changes:

1. Go to Settings
2. Change Assistant Mode to **Helper Mode**
3. The AI will only provide guidance, not make changes

## Security Notes

- All actions use your n8n API key
- Changes are made directly to your n8n instance
- Builder mode respects n8n's permission system
- Destructive actions always require confirmation
