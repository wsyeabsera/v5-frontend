# Error Handling Patterns

Common error handling patterns for interacting with the Agents MCP Server.

## Basic Error Handling

```javascript
async function callToolWithErrorHandling(toolName, arguments = {}) {
  try {
    return await callTool(toolName, arguments);
  } catch (error) {
    console.error(`Error calling ${toolName}:`, error);
    
    // Handle specific error types
    if (error.message.includes('duplicate key')) {
      throw new Error('This item already exists');
    } else if (error.message.includes('not found')) {
      throw new Error('Item not found');
    } else if (error.message.includes('validation')) {
      throw new Error('Invalid input data');
    }
    
    throw error;
  }
}
```

## JSON-RPC Error Handling

```javascript
async function requestWithErrorHandling(method, params = {}) {
  try {
    const response = await fetch('http://localhost:3000/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: generateId(),
        method,
        params,
      }),
    });

    const data = await response.json();

    // Handle JSON-RPC errors
    if (data.error) {
      switch (data.error.code) {
        case -32600:
          throw new Error('Invalid Request');
        case -32601:
          throw new Error('Method not found');
        case -32602:
          throw new Error('Invalid params');
        case -32603:
          throw new Error('Internal error');
        default:
          throw new Error(data.error.message);
      }
    }

    // Handle tool execution errors
    if (data.result?.isError) {
      const errorText = data.result.content[0]?.text || 'Unknown error';
      throw new Error(errorText);
    }

    return data.result;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Could not connect to server');
    }
    throw error;
  }
}
```

## React Error Boundary

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## User-Friendly Error Messages

```javascript
function getErrorMessage(error) {
  const message = error.message || 'Unknown error';
  
  // Map technical errors to user-friendly messages
  const errorMap = {
    'duplicate key': 'This item already exists',
    'not found': 'Item not found',
    'validation': 'Invalid input. Please check your data.',
    'Pinecone': 'Search is not configured. Please contact administrator.',
    'Network': 'Could not connect to server. Please check your connection.',
  };

  for (const [key, userMessage] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return userMessage;
    }
  }

  return message;
}
```

## Retry Logic

```javascript
async function callToolWithRetry(toolName, arguments = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callTool(toolName, arguments);
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation errors
      if (error.message.includes('validation') || 
          error.message.includes('duplicate')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError;
}
```

## Form Validation

```javascript
function validateToolForm(formData) {
  const errors = {};

  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Name is required';
  }

  if (!formData.description || formData.description.trim() === '') {
    errors.description = 'Description is required';
  }

  if (!formData.inputSchema) {
    errors.inputSchema = 'Input schema is required';
  } else {
    try {
      JSON.parse(JSON.stringify(formData.inputSchema));
    } catch (e) {
      errors.inputSchema = 'Invalid JSON schema';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

