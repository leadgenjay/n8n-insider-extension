# Installation Guide

Get N8N Insider up and running in under 5 minutes.

## Requirements

Before installing, make sure you have:

- **Google Chrome** browser (version 88 or later)
- **n8n instance** - Self-hosted or n8n Cloud
- **OpenRouter account** - For AI capabilities (free tier available)

## Step 1: Download the Extension

1. Go to [n8ninsider.com/download](https://n8ninsider.com/download)
2. Click **Download Extension**
3. Save the `.zip` file to your computer

## Step 2: Extract the Files

1. Locate the downloaded `n8n-insider-v*.zip` file
2. Right-click and select **Extract All** (Windows) or double-click (Mac)
3. Choose a permanent location for the extracted folder
   - Recommended: `Documents/Extensions/n8n-insider`
   - Do not delete this folder after installation

## Step 3: Install in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the extracted `n8n-insider` folder (the one containing `manifest.json`)
5. The extension should now appear in your extensions list

## Step 4: Pin the Extension

1. Click the puzzle piece icon in Chrome's toolbar
2. Find **N8N Insider** in the list
3. Click the pin icon to keep it visible in your toolbar

## Step 5: Open the Side Panel

1. Click the N8N Insider icon in your toolbar
2. The side panel will open on the right side of your browser
3. Create an account or sign in to get started

## Next Steps

- [Set up OpenRouter API](/docs/configuration/openrouter-setup) - Required for AI chat
- [Connect your n8n instance](/docs/configuration/n8n-connection) - Enable workflow features
- [Quick Start Guide](/docs/getting-started/quick-start) - Your first conversation

## Troubleshooting

**Extension not loading?**
- Make sure Developer mode is enabled
- Verify you selected the correct folder (should contain `manifest.json`)
- Try refreshing the extensions page

**Can't see the side panel?**
- Click the extension icon in the toolbar
- Some pages (like chrome:// URLs) don't support side panels

**Need to update?**
- Download the new version
- Extract to the same location (overwrite existing files)
- Go to `chrome://extensions` and click the refresh icon on N8N Insider
