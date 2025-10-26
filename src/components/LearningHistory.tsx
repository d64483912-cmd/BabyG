import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Brain, Clock, Lightbulb, TrendingUp } from 'lucide-react';

interface LearnedInsight {
  id: string;
  insight_type: string;
  insight_text: string;
  confidence_score: number;
  created_at: string;
}

interface ObjectiveReflection {
  id: string;
  objective_title: string;
  reflection_text: string;
  lessons_learned: string[];
  created_at: string;
}

interface LearningHistoryProps {
  currentObjectiveTitle?: string;
}

export default function LearningHistory({ currentObjectiveTitle }: LearningHistoryProps) {
  const [insights, setInsights] = useState<LearnedInsight[]>([]);
  const [reflections, setReflections] = useState<ObjectiveReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'insights' | 'reflections'>('insights');

  useEffect(() => {
    fetchLearningData();
  }, [currentObjectiveTitle]);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      // Fetch learned insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('learned_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);

      // Fetch objective reflections
      const { data: reflectionsData, error: reflectionsError } = await supabase
        .from('objective_reflections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (reflectionsError) throw reflectionsError;
      setReflections(reflectionsData || []);
    } catch (error) {
      console.error('Failed to fetch learning history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'timing_pattern':
        return <Clock className="w-4 h-4" />;
      case 'difficulty_pattern':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Learning History</h2>
            <p className="text-xs text-muted-foreground">
              AI insights and reflections from past objectives
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'insights'
                ? 'bg-primary/20 text-primary'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            Learned Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveTab('reflections')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'reflections'
                ? 'bg-primary/20 text-primary'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            Past Reflections ({reflections.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Loading learning history...</p>
          </div>
        ) : (
          <>
            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No insights learned yet</p>
                    <p className="text-xs mt-1">
                      Complete objectives to build AI learning history
                    </p>
                  </div>
                ) : (
                  insights.map((insight) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-primary mt-1">
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-primary/70 capitalize">
                              {insight.insight_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(insight.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90">
                            {insight.insight_text}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                style={{ width: `${insight.confidence_score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(insight.confidence_score * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Reflections Tab */}
            {activeTab === 'reflections' && (
              <div className="space-y-3">
                {reflections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No reflections yet</p>
                    <p className="text-xs mt-1">
                      Complete objectives to generate reflections
                    </p>
                  </div>
                ) : (
                  reflections.map((reflection) => (
                    <motion.div
                      key={reflection.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {reflection.objective_title}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(reflection.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {reflection.reflection_text}
                      </p>
                      {reflection.lessons_learned && reflection.lessons_learned.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-primary/70 mb-1">
                            Lessons Learned:
                          </div>
                          {reflection.lessons_learned.map((lesson, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-foreground/80"
                            >
                              <span className="text-primary mt-0.5">•</span>
                              <span>{lesson}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
