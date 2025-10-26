# 🚀 BabyAGI - Enhanced Intelligent Task Management System

An advanced, AI-powered task management system built with React, TypeScript, and Supabase. This enhanced version features memory systems, predictive analytics, collaborative workspaces, and a futuristic dark theme.

## ✨ Features

### 🧠 Core Intelligence
- **AI-Powered Task Generation**: Automatically breaks down objectives into actionable tasks using AI
- **Memory & Reflection System**: Learns from completed tasks to improve future planning
- **Contextual Knowledge Base**: Vector-based semantic search with pgvector for intelligent context retrieval
- **Multi-Agent Roles**: Specialized AI behaviors for different domains (Developer, Designer, Researcher, Manager, Analyst)

### 🔮 Advanced Analytics
- **Predictive Completion Times**: ML-based estimates using linear regression and task similarity
- **What-If Simulator**: Scenario exploration to predict outcomes of different approaches
- **Velocity Tracking**: Monitor team/personal productivity metrics
- **Rich Visualizations**: Charts, burndown graphs, and progress tracking

### 🤝 Collaboration
- **Shared Objectives Board**: Real-time collaborative planning with RLS security
- **Activity Feed**: Track all changes and collaborator actions
- **Comments System**: Discuss objectives with team members
- **Public/Private Objectives**: Control visibility and access

### 📤 Export & Integration
- **Multi-Format Export**: Markdown, Notion, CSV, and PDF
- **Recursive Task Support**: Maintains subtask hierarchy in all formats
- **Template Management**: Custom prompt templates for different workflows

### 🎨 User Experience
- **Futuristic Dark Theme**: Deep space aesthetics with indigo-to-purple-to-pink gradients
- **Glassmorphism UI**: Modern backdrop-blur and transparency effects
- **PWA Support**: Install as a native app, works offline
- **Responsive Design**: Seamless experience across all devices

### 🔄 Automation
- **Continuous Loop Mode**: Auto-generates follow-up objectives based on learnings
- **Subtask Chaining**: Recursive task breakdown for complex objectives
- **Auto-Evaluation**: Reflects on completed work to capture insights

### 🛠️ Developer Features
- **Custom Prompt Editor**: Create and manage prompt templates
- **Chat-driven Planning**: Interactive AI conversation for objective planning
- **Learning History**: View insights from past objectives
- **Analytics Dashboard**: Comprehensive metrics and visualizations

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand with persistence
- **Backend**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Vector Search**: pgvector with HNSW indexing
- **AI Integration**: OpenAI GPT-4 via edge functions
- **PWA**: Vite PWA plugin with Workbox

### Database Schema

#### Tables
- `learning_history` - Stores reflection data and insights
- `knowledge_base` - Vector embeddings for semantic search (768-dim)
- `knowledge_usage` - Tracks knowledge access patterns
- `shared_objectives` - Collaborative objectives
- `shared_tasks` - Tasks within shared objectives
- `objective_collaborators` - User permissions (owner/editor/viewer)
- `objective_activity` - Activity logging
- `objective_comments` - Discussion threads

#### Edge Functions
- `generate-tasks` - AI task generation with role-specific prompts
- `reflect-on-objective` - Post-completion reflection and learning
- `get-learned-insights` - Retrieve relevant past learnings
- `store-knowledge` - Store content with automatic embeddings
- `search-knowledge` - Semantic search using vector similarity

### Key Components

#### Core
- `BabyAGI.tsx` - Main application component
- `Analytics.tsx` - Comprehensive analytics dashboard
- `PredictionInsights.tsx` - ML-based predictions

#### Collaboration
- `SharedObjectivesBoard.tsx` - Real-time collaborative workspace
- `ChatPlanner.tsx` - AI-powered interactive planning

#### Intelligence
- `KnowledgeBase.tsx` - Vector search interface
- `LearningHistory.tsx` - Historical insights viewer
- `WhatIfSimulator.tsx` - Scenario exploration tool

#### Utilities
- `PromptEditor.tsx` - Template management
- `ExportModal.tsx` - Multi-format export

### Utilities & Libraries
- `prediction-utils.ts` - ML algorithms for time estimation
- `scenario-utils.ts` - Scenario modeling and comparison
- `export-utils.ts` - Export format generators
- `prompt-templates.ts` - Default prompt templates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key (configured in Supabase edge functions)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DrZeepeads/swiftmind-forge.git
cd swiftmind-forge
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run database migrations**
```bash
# Navigate to supabase/migrations and run each migration in order
```

5. **Deploy edge functions**
```bash
supabase functions deploy generate-tasks
supabase functions deploy reflect-on-objective
supabase functions deploy get-learned-insights
supabase functions deploy store-knowledge
supabase functions deploy search-knowledge
```

6. **Start development server**
```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 📖 Usage Guide

### Creating an Objective

1. Click the **"New Goal"** button in the header
2. Enter your objective title and description
3. Select an agent role (Developer, Designer, Researcher, etc.)
4. Click **"Create & Generate Tasks"**
5. AI will automatically generate a task breakdown

### Using Multi-Agent Roles

Each role provides specialized task breakdowns:

- **Developer**: Focuses on technical implementation, testing, deployment
- **Designer**: UX research, wireframing, prototyping, usability testing
- **Researcher**: Research questions, data collection, analysis, reporting
- **Manager**: Planning, coordination, risk management, progress tracking
- **Analyst**: Data gathering, analysis, visualization, insights

### Knowledge Base

The knowledge base automatically stores insights from:
- Completed task reflections
- Manual knowledge entries
- Successful objective patterns

Search semantically using natural language queries. Results are ranked by relevance using cosine similarity.

### What-If Simulator

1. Click the **GitBranch icon** in the header
2. Create scenarios by modifying:
   - Adding/removing tasks
   - Changing priorities
   - Adjusting agent roles
   - Reordering tasks
3. Compare predictions across scenarios
4. Choose the optimal approach

### Predictive Insights

Access via the **Zap icon** in the header:
- Estimated completion time
- Expected completion date
- Risk level assessment
- Bottleneck identification
- Velocity metrics

### Custom Prompt Templates

1. Click the **FileText icon** to open Prompt Editor
2. Browse default templates by category
3. Create custom templates with variables like `{{objective}}`, `{{description}}`
4. Export/import templates for reuse
5. Apply templates to customize AI behavior

### Shared Objectives

1. Click the **Users icon** to access Shared Board
2. Create public or private objectives
3. Invite collaborators with specific roles (owner/editor/viewer)
4. Track activity and add comments
5. Real-time updates for all collaborators

### Export Options

Click **Download icon** to export in:
- **Markdown**: Clean, readable format with task hierarchy
- **Notion**: Formatted for import into Notion
- **CSV**: Spreadsheet-compatible format
- **PDF**: Professionally formatted document

## 🎨 Theme & Design

The application features a futuristic dark theme with:
- Deep space color palette (indigo → purple → pink gradients)
- Glassmorphism effects (backdrop-blur, transparency)
- Smooth animations and transitions
- High contrast for accessibility
- Consistent spacing and typography

## 🔒 Security

- Row Level Security (RLS) policies on all shared tables
- User authentication via Supabase Auth (optional)
- API key protection in edge functions
- CORS-safe edge function configuration

## 📊 Performance

- Code splitting for optimal bundle sizes
- PWA caching strategies for offline support
- Optimized vector search with HNSW indexing
- Real-time subscriptions with minimal overhead
- Lazy loading for heavy components

## 🧪 Testing

The project includes:
- TypeScript for type safety
- Vite for fast development
- Production build optimization
- PWA offline testing

## 📝 Documentation

Additional documentation available:
- `KNOWLEDGE_BASE.md` - Detailed knowledge base architecture
- `supabase/migrations/` - Database schema with comments
- Inline code documentation

## 🤝 Contributing

This is an enhanced version of BabyAGI with significant additions. Contributions welcome!

## 📜 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- Original BabyAGI concept by Yohei Nakajima
- Built with Lovable.dev
- Powered by Supabase and OpenAI

## 🔗 Links

- [Original BabyAGI](https://github.com/yoheinakajima/babyagi)
- [Supabase Documentation](https://supabase.com/docs)
- [pgvector](https://github.com/pgvector/pgvector)

---

**Built with ❤️ using React, TypeScript, Supabase, and AI**

## 🌟 Feature Highlights

### Memory System
The reflection system learns from every completed objective:
```typescript
{
  "what_worked": "Clear task breakdown and prioritization",
  "what_didnt_work": "Initial time estimates were too optimistic",
  "recommendations": "Add buffer time for testing",
  "key_insights": ["Testing phase takes 30% longer", "..."]
}
```

### Vector Search
Knowledge is stored with 768-dimensional embeddings:
```sql
CREATE TABLE knowledge_base (
  embedding vector(768),
  ...
);
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

### Predictive ML
Time estimates use:
- Feature extraction (title length, priority, category, subtask count)
- Cosine similarity to find similar historical tasks
- Linear regression on completion times
- Agent role speed multipliers

### Real-time Collaboration
Powered by Supabase Realtime:
```typescript
supabase
  .channel('shared_objectives_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_objectives' },
    () => { loadObjectives(); }
  )
  .subscribe();
```

## 🎯 Roadmap

Future enhancements could include:
- [ ] Mobile native apps (React Native)
- [ ] Voice input for objectives
- [ ] Integration with project management tools (Jira, Asana)
- [ ] Advanced AI models (GPT-4 Turbo, Claude)
- [ ] Team analytics and reporting
- [ ] Gamification elements
- [ ] API for third-party integrations
- [ ] Custom workflow automation

---

**Version**: 2.0.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅
