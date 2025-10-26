# Knowledge Base Feature

## Overview

The Knowledge Base is a contextual learning system that uses vector embeddings to store, search, and retrieve insights from past objectives and tasks. This feature enables BabyAGI to learn from experience and provide better task recommendations over time.

## Architecture

### Database Schema

#### `knowledge_base` Table
Stores knowledge entries with vector embeddings for semantic search:

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- 768-dimensional vector for text-embedding-004 model
  source_type TEXT NOT NULL, -- 'reflection', 'task_result', 'user_input', 'ai_insight'
  source_id TEXT, -- Reference to related entity
  tags TEXT[], -- Array of tags for categorization
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `knowledge_usage` Table
Tracks how knowledge is used and its effectiveness:

```sql
CREATE TABLE knowledge_usage (
  id UUID PRIMARY KEY,
  knowledge_id UUID REFERENCES knowledge_base(id),
  used_for TEXT NOT NULL, -- 'task_generation', 'reflection', 'planning'
  context TEXT,
  helpful BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Vector Search

The system uses PostgreSQL's `pgvector` extension with HNSW (Hierarchical Navigable Small World) indexing for fast approximate nearest neighbor search:

```sql
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base 
USING hnsw (embedding vector_cosine_ops);
```

This enables efficient similarity search across large knowledge bases.

## Edge Functions

### 1. `store-knowledge`

**Purpose**: Store new knowledge entries with vector embeddings

**Endpoint**: `POST /functions/v1/store-knowledge`

**Request Body**:
```typescript
{
  title: string;           // Short title for the knowledge entry
  content: string;         // Full content/description
  sourceType: 'reflection' | 'task_result' | 'user_input' | 'ai_insight';
  sourceId?: string;       // Optional reference to source entity
  tags?: string[];         // Optional tags for categorization
  relevanceScore?: number; // Optional relevance score (0-1)
}
```

**Process**:
1. Combines title and content into a single text
2. Generates 768-dimensional embedding using `text-embedding-004` model
3. Stores entry in database with embedding

**Response**:
```typescript
{
  success: boolean;
  knowledge: {
    id: string;
    title: string;
    content: string;
    sourceType: string;
    tags: string[];
    createdAt: string;
  }
}
```

### 2. `search-knowledge`

**Purpose**: Search knowledge base using semantic similarity

**Endpoint**: `POST /functions/v1/search-knowledge`

**Request Body**:
```typescript
{
  query: string;              // Search query
  matchThreshold?: number;    // Minimum similarity score (default: 0.7)
  matchCount?: number;        // Number of results (default: 5)
  tags?: string[];            // Filter by tags
  sourceTypes?: string[];     // Filter by source types
  usageContext?: string;      // Track usage context
}
```

**Process**:
1. Generates embedding for search query
2. Performs vector similarity search using cosine distance
3. Filters results by threshold, tags, and source types
4. Records usage in `knowledge_usage` table
5. Increments access count for returned entries

**Response**:
```typescript
{
  success: boolean;
  query: string;
  results: Array<{
    id: string;
    title: string;
    content: string;
    sourceType: string;
    tags: string[];
    relevanceScore: number;
    similarity: number;  // Cosine similarity score (0-1)
  }>;
  count: number;
}
```

## Frontend Component

### KnowledgeBase.tsx

**Features**:
- **Search Bar**: Semantic search across all knowledge entries
- **Tag Filtering**: Filter results by tags
- **Trending Knowledge**: Shows most accessed entries in the last 7 days
- **Auto-Search**: Automatically searches based on current objective
- **Beautiful UI**: Glassmorphism design with animations

**Usage**:
```tsx
<KnowledgeBase 
  autoSearchQuery={currentObjective?.title}
  onSelectKnowledge={(knowledge) => {
    console.log('Selected:', knowledge);
  }}
/>
```

## Integration Points

### 1. Task Generation

When generating tasks, the system searches the knowledge base for relevant context:

```typescript
// In generate-tasks edge function
const { data: knowledgeData } = await supabase.functions.invoke('search-knowledge', {
  body: {
    query: objective,
    matchThreshold: 0.65,
    matchCount: 3,
    usageContext: 'task_generation'
  }
});
```

This context is then included in the AI prompt to generate more informed task breakdowns.

### 2. Reflection Storage

When an objective is completed, key insights are automatically stored:

```typescript
// In BabyAGI.tsx handleReflectionAndContinue
if (data?.reflection) {
  const knowledgeContent = [
    data.reflection.what_worked && `What worked: ${data.reflection.what_worked}`,
    data.reflection.what_didnt_work && `What to improve: ${data.reflection.what_didnt_work}`,
    data.reflection.recommendations && `Recommendations: ${data.reflection.recommendations}`
  ].filter(Boolean).join('\n\n');
  
  await supabase.functions.invoke('store-knowledge', {
    body: {
      title: `Reflection: ${objective.title}`,
      content: knowledgeContent,
      sourceType: 'reflection',
      sourceId: objective.id,
      tags: ['reflection', objective.agentRole || 'general'],
      relevanceScore: 0.9
    }
  });
}
```

### 3. User Interface

Users can access the knowledge base through the header button (lightbulb icon):

```tsx
<button
  onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
  className={`px-3 py-2 rounded-lg transition-all ${
    showKnowledgeBase 
      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50' 
      : 'bg-white/10 hover:bg-white/20'
  }`}
  title="Knowledge Base"
>
  <Lightbulb className="w-4 h-4" />
</button>
```

## Database Functions

### `search_knowledge()`

Performs vector similarity search:

```sql
CREATE FUNCTION search_knowledge(
  query_embedding vector(768),
  match_threshold DECIMAL DEFAULT 0.7,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  tags TEXT[],
  relevance_score DECIMAL,
  similarity DECIMAL
);
```

### `increment_knowledge_access()`

Increments access count when knowledge is used:

```sql
CREATE FUNCTION increment_knowledge_access(knowledge_id UUID)
RETURNS VOID;
```

### `get_trending_knowledge()`

Returns most accessed knowledge in recent timeframe:

```sql
CREATE FUNCTION get_trending_knowledge(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  tags TEXT[],
  access_count INTEGER,
  recent_uses BIGINT
);
```

## Benefits

### 1. Contextual Learning
- System learns from past objectives and tasks
- Better task breakdowns based on historical patterns
- Avoids repeating past mistakes

### 2. Knowledge Discovery
- Users can search their accumulated insights
- Find relevant information from past work
- Surface trending/useful knowledge

### 3. Continuous Improvement
- Knowledge base grows with usage
- More data = better recommendations
- Feedback loop for system improvement

### 4. Semantic Search
- Vector embeddings capture meaning, not just keywords
- Find conceptually similar information
- Better than traditional keyword search

## Performance

### Vector Indexing
- HNSW index provides O(log n) search time
- Approximate nearest neighbor search
- Scales to millions of entries

### Embedding Model
- Uses `text-embedding-004` (768 dimensions)
- High-quality semantic representations
- Supports multiple languages

### Caching
- Access count tracking
- Trending knowledge pre-computed
- Frequently accessed entries prioritized

## Future Enhancements

1. **Knowledge Clustering**: Automatically group related knowledge entries
2. **Knowledge Graph**: Build relationships between entries
3. **Confidence Scoring**: Track effectiveness of knowledge over time
4. **Knowledge Pruning**: Archive outdated or low-value entries
5. **Collaborative Knowledge**: Share knowledge across users (with permissions)
6. **Knowledge Export**: Export knowledge base for backup/analysis
7. **Smart Recommendations**: Proactively suggest relevant knowledge
8. **Knowledge Visualization**: Visual map of knowledge relationships

## Migration

To set up the knowledge base in your Supabase project:

```bash
# Apply the migration
supabase migration up
```

The migration file is located at:
`supabase/migrations/20251027000000_knowledge_base.sql`

## Environment Variables

Required in Supabase:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `LOVABLE_API_KEY`: API key for embedding generation

## Example Workflow

1. User creates objective: "Build a user authentication system"
2. System searches knowledge base for similar past work
3. Finds entry: "Reflection: Implement OAuth login" with high similarity
4. Includes relevant insights in task generation prompt
5. AI generates better informed task breakdown
6. User completes objective
7. System stores reflection insights in knowledge base
8. Future authentication projects benefit from this learning

## Conclusion

The Knowledge Base feature transforms BabyAGI from a task management system into an intelligent learning platform. By leveraging vector embeddings and semantic search, it creates a feedback loop of continuous improvement, making the system smarter with every completed objective.
