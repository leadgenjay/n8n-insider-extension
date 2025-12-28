# AI Models

N8N Insider supports multiple AI models through OpenRouter. All available models have vision capabilities for screenshot analysis.

## Available Models

### Claude Sonnet 4 (Recommended)

**Best for:** General use, most users

- Fast response times
- Excellent accuracy for n8n tasks
- Strong vision capabilities
- Good balance of speed and quality

### GPT-4o

**Best for:** Quick responses

- Very fast response times
- Good vision understanding
- Well-known reliability
- Excellent for rapid iterations

### Claude 3.5 Sonnet

**Best for:** Proven quality

- Battle-tested reliability
- Strong reasoning capabilities
- Good for complex workflows
- Consistent output quality

### Gemini 1.5 Flash

**Best for:** Budget-conscious users

- Lowest cost per request
- Very fast responses
- Good for simple tasks
- Adequate vision capabilities

### Gemini 1.5 Pro

**Best for:** Complex workflows

- 1 million token context window
- Handles very large workflows
- Good for comprehensive analysis
- Medium speed, medium cost

### Claude Opus 4

**Best for:** Complex debugging, premium quality

- Highest reasoning capability
- Best for difficult problems
- Slower response times
- Highest cost

## Choosing a Model

Consider these factors:

| Priority | Recommended Model |
|----------|------------------|
| Speed | GPT-4o or Gemini Flash |
| Quality | Claude Sonnet 4 or Opus 4 |
| Cost | Gemini 1.5 Flash |
| Large workflows | Gemini 1.5 Pro |
| Complex debugging | Claude Opus 4 |

## Changing Models

1. Open N8N Insider
2. Click Settings (gear icon)
3. Scroll to **AI Model**
4. Select your preferred model
5. Changes apply immediately

## Cost Comparison

Approximate costs per 1,000 tokens (varies):

| Model | Input | Output |
|-------|-------|--------|
| Gemini Flash | $0.00003 | $0.00010 |
| GPT-4o | $0.0025 | $0.0100 |
| Claude Sonnet 4 | $0.003 | $0.015 |
| Gemini Pro | $0.00125 | $0.005 |
| Claude Opus 4 | $0.015 | $0.075 |

A typical conversation uses 2,000-5,000 tokens.

Check current pricing at [openrouter.ai/models](https://openrouter.ai/models)

## Why Vision Models Only?

N8N Insider requires vision-capable models because:

1. **Screenshot analysis** - The AI needs to see your workflow canvas
2. **Visual debugging** - Error messages and UI elements are captured visually
3. **Context accuracy** - Visual context provides more accurate help

Text-only models cannot see screenshots and would provide generic, less helpful responses.
