# Connecting to n8n

Connect N8N Insider to your n8n instance to unlock Builder mode - where the AI can create and modify workflows directly.

## Prerequisites

- An n8n instance (self-hosted or n8n Cloud)
- Admin access to generate API keys

## Get Your n8n Instance URL

Your n8n URL is the address you use to access n8n in your browser.

**Examples:**
- Self-hosted: `https://n8n.yourdomain.com`
- n8n Cloud: `https://your-instance.app.n8n.cloud`
- Local: `http://localhost:5678`

**Important:** Do not include `/api/v1` at the end - N8N Insider adds this automatically.

## Generate an n8n API Key

### For Self-Hosted n8n

1. Open your n8n instance
2. Click your **profile icon** (bottom left)
3. Go to **Settings**
4. Navigate to **API** section
5. Click **Create API Key**
6. Give it a name (e.g., "N8N Insider")
7. Copy the key

### For n8n Cloud

1. Open your n8n Cloud instance
2. Click **Settings** (gear icon)
3. Go to **API**
4. Create a new API key
5. Copy the key

## Add to N8N Insider

1. Open N8N Insider (click the extension icon)
2. Click the **Settings** gear icon
3. Scroll to **n8n Instance**
4. Enter your **Instance URL**
5. Enter your **API Key**
6. Click **Save & Test**

A green "Connected" indicator confirms successful connection.

## Enable Builder Mode

Once connected, you can enable Builder mode:

1. In Settings, scroll to **Assistant Mode**
2. Select **Builder Mode**
3. The AI can now create workflows, add nodes, and make changes

See [Builder Mode](/docs/features/builder-mode) for details on what the AI can do.

## Troubleshooting

**"Connection failed" error:**

Check these common issues:

1. **URL format** - Should not end with `/api/v1` or trailing slash
   - Correct: `https://n8n.example.com`
   - Wrong: `https://n8n.example.com/api/v1/`

2. **CORS issues** - Your n8n instance may need CORS configuration for the extension

3. **API key permissions** - Ensure the API key has sufficient permissions

4. **HTTPS required** - Most browsers require secure connections

**"Unauthorized" error:**
- Your API key may have expired
- Generate a new API key in n8n
- Make sure you copied the complete key

**"Network error":**
- Check if your n8n instance is accessible
- Try opening your n8n URL directly in the browser
- VPN or firewall may be blocking the connection

## Security Notes

- Your API key is stored locally in Chrome's secure storage
- The key is only sent directly to your n8n instance
- We never see or store your API credentials on our servers
- Revoke the key in n8n if you suspect it's compromised
