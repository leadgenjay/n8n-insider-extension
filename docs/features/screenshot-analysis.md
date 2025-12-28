# Screenshot Analysis

N8N Insider uses vision AI to see and understand your n8n canvas, giving you context-aware assistance.

## How It Works

When you send a message, N8N Insider automatically:

1. **Captures a screenshot** of your current browser tab
2. **Extracts workflow data** from the n8n page (nodes, connections)
3. **Sends both to the AI** along with your message

This allows the AI to:
- See exactly what you're looking at
- Understand your workflow structure
- Reference specific nodes visually
- Identify issues from error messages on screen

## Automatic vs Manual Capture

### Automatic Capture

Every message automatically includes fresh context. You don't need to do anything special - just ask your question.

The capture happens in the background with a 2-second timeout to keep the interface responsive.

### Manual Capture

Click the **camera icon** next to the input field to capture before typing.

Use manual capture when:
- You want to capture a specific state before it changes
- You're on a slow connection and want to pre-load context
- You want to verify what context will be sent

A blue indicator shows when context is attached.

## What the AI Sees

The AI receives:

**Screenshot**
- Full page capture of your current tab
- Includes visible nodes, connections, sidebar, and any error messages
- Captured at screen resolution

**Workflow Data** (when on n8n)
- Workflow name and ID
- List of all nodes (names and types)
- Node parameters and settings
- Connection mappings between nodes

**Current URL**
- Helps identify if you're in the workflow editor, executions view, etc.

## Example Use Cases

**Debugging visual issues**
```
User: Why do I have a red error on the second node?

AI: I can see the HTTP Request node has failed with a 404 error.
    The URL in your request might be incorrect. Check that the
    endpoint path includes the required ID parameter.
```

**Getting help with what's on screen**
```
User: What does this workflow do?

AI: Looking at your canvas, this workflow:
    1. Triggers on a webhook call
    2. Filters items using an IF node
    3. Sends matching items to Slack
    4. Logs others to a Google Sheet
```

**Referencing specific nodes**
```
User: How do I fix the expression in the top-right node?

AI: In the "Format Data" Code node, your expression has a
    syntax error. Change {{ $json.name } to {{ $json.name }}
    (add the missing closing brace).
```

## Supported Vision Models

Only vision-capable AI models work with screenshot analysis:

- Claude Sonnet 4 (recommended)
- GPT-4o
- Claude 3.5 Sonnet
- Gemini 1.5 Flash
- Gemini 1.5 Pro
- Claude Opus 4

Text-only models are not available in N8N Insider.

## Privacy & Data

- Screenshots are sent directly to OpenRouter's API
- Images are not stored on our servers
- OpenRouter's privacy policy applies
- Consider this when working with sensitive data

## Tips for Better Analysis

1. **Zoom to fit** - Make sure relevant nodes are visible
2. **Open error details** - Expand error messages before capturing
3. **Close overlays** - Dismiss any popups that might obscure the canvas
4. **Use light theme** - Some models perform better with lighter UI themes
