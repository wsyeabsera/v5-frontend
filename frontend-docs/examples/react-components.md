# React Components Examples

Complete React component examples for interacting with the Agents MCP Server.

## Tool Management Component

```jsx
import React, { useState, useEffect } from 'react';
import { ToolService } from './api-client.js';

function ToolManagement() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inputSchema: {},
    source: 'local',
  });

  const service = new ToolService();

  useEffect(() => {
    loadTools();
  }, [filter]);

  const loadTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== 'all' ? { source: filter } : {};
      const data = await service.listTools(params);
      setTools(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await service.createTool(formData);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        inputSchema: {},
        source: 'local',
      });
      loadTools();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete tool "${name}"?`)) return;
    
    try {
      await service.deleteTool(name);
      loadTools();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Tool Management</h2>

      <div>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Tool'}
        </button>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Tools</option>
          <option value="local">Local</option>
          <option value="remote">Remote</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate}>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Tool name"
            required
          />
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description"
            required
          />
          <textarea
            value={JSON.stringify(formData.inputSchema, null, 2)}
            onChange={(e) => {
              try {
                setFormData({ ...formData, inputSchema: JSON.parse(e.target.value) });
              } catch {}
            }}
            placeholder="Input Schema (JSON)"
            required
          />
          <select
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          >
            <option value="local">Local</option>
            <option value="remote">Remote</option>
          </select>
          <button type="submit">Create</button>
        </form>
      )}

      {error && <div className="error">Error: {error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool._id}>
                <td>{tool.name}</td>
                <td>{tool.description}</td>
                <td>{tool.source}</td>
                <td>
                  <button onClick={() => handleDelete(tool.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ToolManagement;
```

## Model Management Component

```jsx
import React, { useState, useEffect } from 'react';
import { ModelService } from './api-client.js';

function ModelManagement() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('');
  const [modelName, setModelName] = useState('');

  const service = new ModelService();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await service.listModels();
      setModels(data);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!provider || !modelName) return;
    
    try {
      await service.createModel(provider, modelName);
      setProvider('');
      setModelName('');
      loadModels();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Available Models</h2>
      
      <form onSubmit={handleCreate}>
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Provider (e.g., openai)"
          required
        />
        <input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="Model name (e.g., gpt-4)"
          required
        />
        <button type="submit">Add Model</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model._id}>
                <td>{model.provider}</td>
                <td>{model.modelName}</td>
                <td>
                  <button onClick={() => service.deleteModel(model._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ModelManagement;
```

## Tool Executor Component

```jsx
import React, { useState } from 'react';
import { ToolExecutionService } from './api-client.js';

function ToolExecutor() {
  const [toolName, setToolName] = useState('');
  const [arguments, setArguments] = useState({});
  const [argumentsText, setArgumentsText] = useState('{}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const service = new ToolExecutionService();

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let args = {};
      try {
        args = JSON.parse(argumentsText);
      } catch (e) {
        throw new Error('Invalid JSON in arguments');
      }

      const data = await service.executeTool(toolName, args);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Tool Executor</h2>
      
      <div>
        <input
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          placeholder="Tool name"
        />
        <textarea
          value={argumentsText}
          onChange={(e) => {
            setArgumentsText(e.target.value);
            try {
              setArguments(JSON.parse(e.target.value));
            } catch {}
          }}
          placeholder='Arguments (JSON)'
          rows={10}
        />
        <button onClick={handleExecute} disabled={loading || !toolName}>
          {loading ? 'Executing...' : 'Execute'}
        </button>
      </div>

      {error && (
        <div className="error">Error: {error}</div>
      )}

      {result && (
        <div>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default ToolExecutor;
```

## Search Component

```jsx
import React, { useState } from 'react';
import { SearchService } from './api-client.js';

function SearchDiscovery() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('tools');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const service = new SearchService();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      let data;
      if (searchType === 'tools') {
        data = await service.searchTools(query);
      } else {
        data = await service.searchPrompts(query);
      }
      setResults(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Search & Discovery</h2>
      
      <div>
        <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="tools">Search Tools</option>
          <option value="prompts">Search Prompts</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Describe what you want to do..."
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="error">{error}</div>
      )}

      {results.length > 0 && (
        <div>
          <h3>Results ({results.length})</h3>
          {results.map((result, index) => (
            <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h4>{result.name}</h4>
              <p>{result.description}</p>
              {result.score && (
                <div>Relevance: {(result.score * 100).toFixed(1)}%</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchDiscovery;
```

