# Troubleshooting

Common issues and how to fix them.

## Installation Issues

### Extension won't load

**Symptoms:** Extension doesn't appear in Chrome, or shows an error.

**Solutions:**
1. Verify Developer mode is enabled at `chrome://extensions`
2. Make sure you selected the folder containing `manifest.json`
3. Check if the folder was fully extracted (not still zipped)
4. Try removing and re-adding the extension

### Side panel doesn't open

**Symptoms:** Clicking the extension icon does nothing.

**Solutions:**
1. Try right-clicking the icon and selecting "Open side panel"
2. Some pages (chrome://, file://) don't support side panels
3. Navigate to a regular website first, then open the panel
4. Restart Chrome completely

## Connection Issues

### OpenRouter not connecting

**Symptoms:** "Connection failed" or "Invalid API key" error.

**Solutions:**
1. Verify your API key starts with `sk-or-`
2. Check for extra spaces when pasting
3. Make sure your OpenRouter account has credits
4. Try generating a new API key

### n8n connection failing

**Symptoms:** Can't connect to n8n instance.

**Solutions:**
1. Check URL format: `https://n8n.example.com` (no `/api/v1`)
2. Verify your n8n instance is accessible in the browser
3. Generate a new API key in n8n
4. Check if CORS is blocking the connection (see below)

### CORS errors

**Symptoms:** Connection fails with CORS or network error.

**Solutions for self-hosted n8n:**

Add these environment variables to your n8n configuration:
```
N8N_CORS_ALLOWED_ORIGINS=*
```

Or more restrictively:
```
N8N_CORS_ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

Then restart n8n.

## Chat Issues

### AI responses are slow

**Symptoms:** Long wait times for responses.

**Solutions:**
1. Try a faster model (GPT-4o or Gemini Flash)
2. Check your internet connection
3. OpenRouter may have high load - try again later

### AI doesn't understand my workflow

**Symptoms:** Responses seem generic or miss context.

**Solutions:**
1. Make sure you're on an n8n workflow page
2. Try manual capture (click camera icon) before sending
3. Zoom your workflow to show relevant nodes
4. Be more specific in your question

### "Daily limit reached" message

**Symptoms:** Can't send messages, shows upgrade prompt.

**Solutions:**
1. Wait until tomorrow (resets at midnight)
2. Upgrade to Pro for unlimited messages
3. Check your usage in Settings

## Builder Mode Issues

### Changes not appearing in n8n

**Symptoms:** AI says it made changes, but n8n looks the same.

**Solutions:**
1. **Refresh your n8n page** - Changes require a page reload
2. Check if you're looking at the correct workflow
3. Verify the action completed (check AI response)

### "Node not found" errors

**Symptoms:** AI can't find or modify a node.

**Solutions:**
1. Make sure node names match exactly (case-sensitive)
2. Refresh your n8n page to sync the workflow
3. Try referencing the node by its visual position

### Confirmation dialog not appearing

**Symptoms:** Destructive actions execute without asking.

**Solutions:**
- This shouldn't happen. Please report this bug.
- Destructive actions (delete, update) always require confirmation.

## Account Issues

### Can't sign in

**Symptoms:** Login fails or account not recognized.

**Solutions:**
1. Check if you're using the correct email
2. Try "Forgot password" if using email/password
3. Clear extension storage and try again
4. Try Google sign-in as alternative

### Email verification pending

**Symptoms:** Can't access features, asked to verify email.

**Solutions:**
1. Check your email inbox (and spam folder)
2. Click "Resend verification email" in the extension
3. Use a different email if delivery fails

### Pro subscription not recognized

**Symptoms:** Still seeing free tier limits after subscribing.

**Solutions:**
1. Sign out and sign back in
2. Wait a few minutes for webhook processing
3. Check your email for payment confirmation
4. Contact support if issue persists

## Getting Help

If you can't resolve an issue:

1. **Check for updates** - Download the latest version
2. **Clear extension data** - Remove and reinstall the extension
3. **Contact support** - Email support@n8ninsider.com

When reporting issues, include:
- Chrome version
- Extension version
- Screenshot of the error
- Steps to reproduce
