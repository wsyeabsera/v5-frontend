# Search & Discovery

Semantic search tools to find tools and prompts by natural language.

## Available Tools

### `get_tool_for_user_prompt`

Get the best tool(s) for a user query using semantic search.

**Arguments:**
- `userPrompt` (string, required) - User query or request to find the best tool for
- `topK` (number, optional) - Number of top tools to return (default: 3)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get_tool_for_user_prompt",
    "arguments": {
      "userPrompt": "I need to create a new facility",
      "topK": 3
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[\n  {\n    \"name\": \"create_facility\",\n    \"description\": \"Create a new facility\",\n    \"score\": 0.95,\n    \"inputSchema\": {...}\n  }\n]"
      }
    ]
  }
}
```

**Note:** This requires Pinecone to be configured. If not configured, an error will be returned.

### `get_prompt_for_user_prompt`

Get the best prompt(s) for a user query using semantic search.

**Arguments:**
- `userPrompt` (string, required) - User query or request to find the best prompt for
- `topK` (number, optional) - Number of top prompts to return (default: 3)

**Example:**
```javascript
const prompts = await callTool('get_prompt_for_user_prompt', {
  userPrompt: 'Generate a report about facilities',
  topK: 5
});
```

## Frontend Implementation Example

```javascript
// Search Service
class SearchService {
  async searchTools(query, topK = 3) {
    try {
      const results = await callTool('get_tool_for_user_prompt', {
        userPrompt: query,
        topK,
      });
      return results;
    } catch (error) {
      if (error.message.includes('Pinecone')) {
        throw new Error('Semantic search is not configured. Please set up Pinecone.');
      }
      throw error;
    }
  }

  async searchPrompts(query, topK = 3) {
    try {
      const results = await callTool('get_prompt_for_user_prompt', {
        userPrompt: query,
        topK,
      });
      return results;
    } catch (error) {
      if (error.message.includes('Pinecone')) {
        throw new Error('Semantic search is not configured. Please set up Pinecone.');
      }
      throw error;
    }
  }
}
```

## React Component Example

```jsx
function SearchDiscovery() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchType, setSearchType] = useState('tools');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchService = new SearchService();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      let data;
      if (searchType === 'tools') {
        data = await searchService.searchTools(query);
      } else {
        data = await searchService.searchPrompts(query);
      }
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults([]);
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
            <div key={index} className="result-card">
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
```

## Common Use Cases

1. **Intelligent Tool Discovery** - Find tools by describing what you want to do
2. **Prompt Finder** - Find relevant prompts using natural language
3. **Assistant Interface** - Build an assistant that suggests tools based on user intent
4. **Workflow Builder** - Discover tools to chain together in workflows

## Requirements

- Pinecone must be configured with `PINECONE_API_KEY` and `PINECONE_TOOLS_INDEX_NAME`
- Ollama must be running locally for embedding generation
- Tools and prompts must be indexed in Pinecone (via `init_tools` and `init_prompts`)

