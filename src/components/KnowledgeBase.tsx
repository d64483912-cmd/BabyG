import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Brain, 
  Sparkles, 
  Clock, 
  Tag, 
  TrendingUp,
  BookOpen,
  Lightbulb,
  FileText,
  MessageSquare,
  X,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  tags: string[];
  relevanceScore: number;
  similarity?: number;
  createdAt: string;
  accessCount?: number;
}

interface KnowledgeBaseProps {
  onSelectKnowledge?: (knowledge: KnowledgeEntry) => void;
  autoSearchQuery?: string;
}

const sourceTypeIcons: Record<string, React.ReactNode> = {
  reflection: <Lightbulb className="w-4 h-4" />,
  task_result: <FileText className="w-4 h-4" />,
  user_input: <MessageSquare className="w-4 h-4" />,
  ai_insight: <Sparkles className="w-4 h-4" />
};

const sourceTypeLabels: Record<string, string> = {
  reflection: 'Reflection',
  task_result: 'Task Result',
  user_input: 'User Input',
  ai_insight: 'AI Insight'
};

export default function KnowledgeBase({ onSelectKnowledge, autoSearchQuery }: KnowledgeBaseProps) {
  const [searchQuery, setSearchQuery] = useState(autoSearchQuery || '');
  const [searchResults, setSearchResults] = useState<KnowledgeEntry[]>([]);
  const [trendingKnowledge, setTrendingKnowledge] = useState<KnowledgeEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Auto-search when autoSearchQuery is provided
  useEffect(() => {
    if (autoSearchQuery) {
      handleSearch();
    }
  }, [autoSearchQuery]);

  // Load trending knowledge on mount
  useEffect(() => {
    loadTrendingKnowledge();
    loadAvailableTags();
  }, []);

  const loadTrendingKnowledge = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_knowledge', {
          days_back: 7,
          limit_count: 5
        });

      if (error) throw error;

      if (data) {
        setTrendingKnowledge(data.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          sourceType: item.source_type,
          tags: item.tags || [],
          relevanceScore: 1.0,
          accessCount: item.access_count,
          createdAt: new Date().toISOString()
        })));
      }
    } catch (error) {
      console.error('Error loading trending knowledge:', error);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      if (data) {
        const allTags = new Set<string>();
        data.forEach((item: any) => {
          if (item.tags) {
            item.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-knowledge', {
        body: {
          query: searchQuery,
          matchThreshold: 0.6,
          matchCount: 10,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          usageContext: 'user_search'
        }
      });

      if (error) throw error;

      if (data?.results) {
        setSearchResults(data.results.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          sourceType: item.sourceType,
          tags: item.tags || [],
          relevanceScore: item.relevanceScore,
          similarity: item.similarity,
          createdAt: new Date().toISOString()
        })));

        if (data.results.length === 0) {
          toast.info('No relevant knowledge found');
        } else {
          toast.success(`Found ${data.results.length} relevant entries`);
        }
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
      toast.error('Failed to search knowledge base');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  const KnowledgeCard = ({ entry }: { entry: KnowledgeEntry }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 backdrop-blur-lg rounded-xl p-5 border border-white/10 hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => onSelectKnowledge?.(entry)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            {sourceTypeIcons[entry.sourceType] || <Brain className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
              {entry.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sourceTypeLabels[entry.sourceType] || entry.sourceType}
            </p>
          </div>
        </div>
        {entry.similarity && (
          <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-green-400">
              {(entry.similarity * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {entry.content}
      </p>

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {entry.accessCount !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Clock className="w-3 h-3" />
          Used {entry.accessCount} times
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Knowledge Base
          </h2>
          <p className="text-sm text-muted-foreground">
            Search and explore your accumulated insights
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your knowledge base..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSearching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            ) : (
              'Search'
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-all ${
              showFilters || selectedTags.length > 0
                ? 'bg-primary/20 border-primary/50'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Filter by Tags
                </h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags available yet</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Tags */}
        {selectedTags.length > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary text-sm rounded-full"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Search Results ({searchResults.length})</h3>
          </div>
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {searchResults.map((entry) => (
                <KnowledgeCard key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Trending Knowledge */}
      {trendingKnowledge.length > 0 && searchResults.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Trending Knowledge</h3>
            <span className="text-xs text-muted-foreground">Most accessed in the last 7 days</span>
          </div>
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {trendingKnowledge.map((entry) => (
                <KnowledgeCard key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && trendingKnowledge.length === 0 && !isSearching && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10"
        >
          <div className="inline-flex p-4 bg-primary/20 rounded-full mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Knowledge Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your knowledge base will grow as you complete objectives and tasks. 
            Insights and learnings will be automatically captured.
          </p>
        </motion.div>
      )}
    </div>
  );
}
