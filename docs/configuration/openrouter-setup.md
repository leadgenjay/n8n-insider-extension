# OpenRouter Setup

OpenRouter provides access to multiple AI models through a single API. N8N Insider uses OpenRouter for all AI capabilities.

## Create an OpenRouter Account

1. Go to [openrouter.ai](https://openrouter.ai)
2. Click **Sign Up** or **Sign In**
3. You can sign up with Google, GitHub, or email

## Get Your API Key

1. After signing in, go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Click **Create Key**
3. Give your key a name (e.g., "N8N Insider")
4. Copy the key - it starts with `sk-or-`

**Important:** Save this key somewhere safe. You won't be able to see it again after leaving the page.

## Add Key to N8N Insider

1. Open N8N Insider (click the extension icon)
2. Click the **Settings** gear icon
3. Scroll to **AI Provider (OpenRouter)**
4. Paste your API key in the field
5. Click **Save & Test**

You should see a green "Connected" indicator if successful.

## Choose an AI Model

N8N Insider only shows vision-capable models (required for screenshot analysis):

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| **Claude Sonnet 4** (Recommended) | General use, accurate responses | Fast | Medium |
| **GPT-4o** | Quick responses, good vision | Very Fast | Medium |
| **Claude 3.5 Sonnet** | Proven quality | Fast | Medium |
| **Gemini 1.5 Flash** | Budget-friendly option | Very Fast | Low |
| **Gemini 1.5 Pro** | Complex workflows, large context | Medium | Medium |
| **Claude Opus 4** | Complex debugging, premium quality | Slower | High |

Select your preferred model in Settings under **AI Model**.

## Billing & Credits

OpenRouter offers:
- **Free credits** for new accounts (limited)
- **Pay-as-you-go** billing for continued use
- Per-token pricing varies by model

Add credits at [openrouter.ai/credits](https://openrouter.ai/credits)

## Troubleshooting

**"Invalid API key" error:**
- Make sure you copied the full key (starts with `sk-or-`)
- Check for extra spaces before or after the key
- Generate a new key if needed

**"Insufficient credits" error:**
- Add credits to your OpenRouter account
- Or switch to a cheaper model (Gemini Flash is most affordable)

**Connection test fails:**
- Check your internet connection
- Try refreshing the extension (go to chrome://extensions and click refresh)
- OpenRouter may have temporary outages - check their status page
