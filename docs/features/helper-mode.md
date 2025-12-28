# Helper Mode

Helper mode is the default mode where the AI provides suggestions, explanations, and guidance - but you make all changes manually.

## When to Use Helper Mode

Helper mode is ideal when you:
- Want to learn how n8n works
- Prefer to make changes yourself
- Don't have an n8n API connection
- Are exploring ideas before implementing

## What the AI Can Do

In Helper mode, the AI can:

**Explain concepts**
- How specific n8n nodes work
- Expression syntax and examples
- Best practices for workflow design

**Provide suggestions**
- Node recommendations for your use case
- Debugging tips for errors
- Workflow architecture advice

**Generate code and expressions**
- n8n expressions: `{{ $json.fieldName }}`
- JavaScript code for Function nodes
- JSON structures for webhook payloads

**Analyze your workflow**
- Review screenshot for visual context
- Identify potential issues
- Suggest optimizations

## What the AI Cannot Do

In Helper mode, the AI cannot:
- Create or delete workflows
- Add, modify, or remove nodes
- Change node settings or connections
- Activate or deactivate workflows

For these capabilities, use [Builder Mode](/docs/features/builder-mode).

## Example Conversations

**Learning about nodes:**
```
User: How does the IF node work?

AI: The IF node routes items based on conditions.
    Each item is evaluated against your rules and
    sent to either the "true" or "false" output.

    Example condition: {{ $json.status }} equals "active"
```

**Getting expressions:**
```
User: I need to format today's date as YYYY-MM-DD

AI: Use this expression: {{ $now.format('yyyy-MM-dd') }}

    Note: Luxon uses lowercase yyyy, not uppercase YYYY.
```

**Debugging help:**
```
User: My HTTP Request is returning a 401 error

AI: A 401 error means authentication failed. Check:
    1. Your API key is correct and not expired
    2. The key is in the right header (usually Authorization)
    3. Format is correct: "Bearer YOUR_KEY" vs just "YOUR_KEY"
```

## Switching to Builder Mode

To enable the AI to make direct changes:

1. [Connect your n8n instance](/docs/configuration/n8n-connection)
2. Go to Settings
3. Change Assistant Mode to **Builder Mode**

See [Builder Mode](/docs/features/builder-mode) for details.
