---
name: n8n-workflows
description: Create n8n webhook integrations. Use for backend actions, automations, sending emails, creating invoices, or running jobs.
---

# n8n Workflow Integration

## Webhook Pattern
- n8n exposes webhook URLs for workflows
- App calls n8n webhooks for actions
- n8n handles complex logic, API calls, and automations

## Common Use Cases
- Send transactional emails
- Create invoices/payments
- Process background jobs
- Sync data between services
- Handle scheduled tasks

## Integration Pattern

### Basic Webhook Caller
```typescript
// lib/n8n.ts
export async function triggerWorkflow(
  webhookId: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(
    `${process.env.N8N_WEBHOOK_URL}/${webhookId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return response.json();
}
```

### Typed Webhook with Error Handling
```typescript
// lib/n8n.ts
interface WorkflowResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function callN8nWorkflow<T>(
  webhookPath: string,
  payload: Record<string, unknown>
): Promise<WorkflowResponse<T>> {
  try {
    const response = await fetch(
      `${process.env.N8N_WEBHOOK_URL}/${webhookPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`n8n error: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('n8n workflow error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Environment Variables
- `N8N_WEBHOOK_URL` - Base URL for n8n webhooks (e.g., https://n8n.yoursite.com/webhook)
- `N8N_API_KEY` - Optional API key for authentication
- Store webhook IDs in env vars or database

## Usage Examples

### Send Email
```typescript
await callN8nWorkflow('send-email', {
  to: user.email,
  template: 'welcome',
  data: { name: user.name }
});
```

### Create Invoice
```typescript
await callN8nWorkflow('create-invoice', {
  customerId: customer.id,
  items: orderItems,
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

### Background Job
```typescript
await callN8nWorkflow('process-job', {
  jobType: 'generate-report',
  params: { reportId, format: 'pdf' }
});
```
