/**
 * n8n Tool Definitions for OpenRouter Function Calling
 * These tools enable the AI to perform actions in n8n
 */

// Tool definition type (OpenAI compatible format used by OpenRouter)
export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description?: string
        items?: { type: string }
        enum?: string[]
      }>
      required?: string[]
    }
  }
}

// ALL tools require user confirmation to prevent unauthorized actions
// The AI should NEVER execute actions without explicit user approval
export const TOOLS_REQUIRING_CONFIRMATION = new Set([
  'duplicate_workflow',
  'create_workflow',
  'activate_workflow',
  'deactivate_workflow',
  'update_node',
  'add_node',
  'delete_node',
  'delete_workflow',
])

// Tool definitions for n8n operations
export const N8N_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'duplicate_workflow',
      description: 'Duplicate an existing workflow with a new name. Creates a copy of the workflow without modifying the original.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow to duplicate (from the current workflow context)',
          },
          new_name: {
            type: 'string',
            description: 'The name for the new duplicated workflow',
          },
        },
        required: ['workflow_id', 'new_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_workflow',
      description: 'Create a new empty workflow with the specified name. Use this when the user wants to start a completely new workflow.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name for the new workflow',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activate_workflow',
      description: 'Activate a workflow so it runs automatically when triggered. Use this when the user wants to turn on a workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow to activate',
          },
        },
        required: ['workflow_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deactivate_workflow',
      description: 'Deactivate a workflow so it stops running automatically. Use this when the user wants to turn off a workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow to deactivate',
          },
        },
        required: ['workflow_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_node',
      description: 'Update a node\'s parameters in a workflow. Use this to change node settings, fix expressions, or modify configurations. REQUIRES USER CONFIRMATION.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow containing the node',
          },
          node_name: {
            type: 'string',
            description: 'The exact name of the node to update (as shown in the workflow)',
          },
          parameters: {
            type: 'object',
            description: 'The parameters to update on the node. Only include the fields that need to change.',
          },
        },
        required: ['workflow_id', 'node_name', 'parameters'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_node',
      description: 'Add a new node to a workflow. For sticky notes use type "n8n-nodes-base.stickyNote" with parameters including content, width, height, color.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow to add the node to',
          },
          node_name: {
            type: 'string',
            description: 'The name for the new node (must be unique)',
          },
          node_type: {
            type: 'string',
            description: 'The n8n node type. For sticky notes: "n8n-nodes-base.stickyNote"',
          },
          parameters: {
            type: 'object',
            description: 'Node parameters. For sticky notes: { content: "markdown text", width: 300, height: 200, color: 4 }. Colors: 1=blue, 2=yellow, 3=red, 4=green, 5=purple, 6=gray',
          },
          position: {
            type: 'array',
            description: 'Position as [x, y] coordinates. For overview stickies: [0, -200]. For node annotations: position near the related node.',
            items: { type: 'number' },
          },
          connect_from: {
            type: 'string',
            description: 'Optional: The name of an existing node to connect from (not used for sticky notes)',
          },
        },
        required: ['workflow_id', 'node_name', 'node_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_node',
      description: 'Delete a node from a workflow. REQUIRES USER CONFIRMATION. This removes the node and all its connections.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow containing the node',
          },
          node_name: {
            type: 'string',
            description: 'The exact name of the node to delete',
          },
        },
        required: ['workflow_id', 'node_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_workflow',
      description: 'Delete a workflow entirely. REQUIRES USER CONFIRMATION. This cannot be undone.',
      parameters: {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'The ID of the workflow to delete',
          },
        },
        required: ['workflow_id'],
      },
    },
  },
]

// Web search tools (read-only, no confirmation needed)
export const WEB_SEARCH_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_documentation',
      description: 'Search the web for API documentation. Use this when the user confirms they want you to search for documentation about an API they are having trouble with.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query. Include the API name and what information is needed (e.g., "Stripe API authentication guide", "Gmail API OAuth2 setup")',
          },
          api_name: {
            type: 'string',
            description: 'The name of the API being searched for (e.g., "Stripe", "Gmail", "Shopify")',
          },
        },
        required: ['query', 'api_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch and read content from a URL that the user provided. Use this when the user shares a link to documentation.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL to fetch (must start with http:// or https://)',
          },
        },
        required: ['url'],
      },
    },
  },
]

// Human-readable descriptions for confirmation UI
export const TOOL_DESCRIPTIONS: Record<string, {
  action: string
  icon: string
  confirmMessage: (args: Record<string, unknown>) => string
}> = {
  duplicate_workflow: {
    action: 'Duplicate Workflow',
    icon: '📋',
    confirmMessage: (args) => `Create a copy of this workflow named "${args.new_name}"`,
  },
  create_workflow: {
    action: 'Create Workflow',
    icon: '➕',
    confirmMessage: (args) => `Create a new workflow named "${args.name}"`,
  },
  activate_workflow: {
    action: 'Activate Workflow',
    icon: '▶️',
    confirmMessage: () => 'Turn on this workflow so it runs automatically',
  },
  deactivate_workflow: {
    action: 'Deactivate Workflow',
    icon: '⏸️',
    confirmMessage: () => 'Turn off this workflow',
  },
  update_node: {
    action: 'Update Node',
    icon: '✏️',
    confirmMessage: (args) => `Update the "${args.node_name}" node with new parameters`,
  },
  add_node: {
    action: 'Add Node',
    icon: '➕',
    confirmMessage: (args) => `Add a new "${args.node_name}" node to the workflow`,
  },
  delete_node: {
    action: 'Delete Node',
    icon: '🗑️',
    confirmMessage: (args) => `Delete the "${args.node_name}" node from the workflow`,
  },
  delete_workflow: {
    action: 'Delete Workflow',
    icon: '🗑️',
    confirmMessage: () => 'Permanently delete this workflow (cannot be undone)',
  },
  // Web search tools (no confirmation needed)
  search_documentation: {
    action: 'Search Documentation',
    icon: '🔍',
    confirmMessage: (args) => `Search for "${args.api_name}" API documentation`,
  },
  fetch_url: {
    action: 'Fetch URL',
    icon: '🌐',
    confirmMessage: (args) => `Read content from ${args.url}`,
  },
}
