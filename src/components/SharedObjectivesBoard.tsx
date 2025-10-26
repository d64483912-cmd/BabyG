import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Globe,
  Lock,
  Plus,
  UserPlus,
  MessageSquare,
  Activity,
  CheckCircle2,
  Circle,
  Clock,
  Crown,
  Edit3,
  Eye,
  X,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharedObjective {
  id: string;
  title: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  agent_role: string;
  is_public: boolean;
  is_owner: boolean;
  collaborator_role?: string;
  task_count: number;
  completed_task_count: number;
}

interface ActivityItem {
  id: string;
  user_id: string;
  action_type: string;
  action_data: any;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function SharedObjectivesBoard() {
  const [objectives, setObjectives] = useState<SharedObjective[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<SharedObjective | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [newObjectiveDesc, setNewObjectiveDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    checkAuth();
    loadObjectives();
    setupRealtimeSubscriptions();
  }, []);

  useEffect(() => {
    if (selectedObjective) {
      loadActivity(selectedObjective.id);
      loadComments(selectedObjective.id);
    }
  }, [selectedObjective]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadObjectives = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_objectives');

      if (error) throw error;

      setObjectives(data || []);
    } catch (error) {
      console.error('Error loading objectives:', error);
      toast.error('Failed to load objectives');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async (objectiveId: string) => {
    try {
      const { data, error } = await supabase
        .from('objective_activity')
        .select('*')
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setActivity(data || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const loadComments = async (objectiveId: string) => {
    try {
      const { data, error } = await supabase
        .from('objective_comments')
        .select('*')
        .eq('objective_id', objectiveId)
        .is('task_id', null)
        .eq('deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to shared_objectives changes
    const objectivesChannel = supabase
      .channel('shared_objectives_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_objectives'
        },
        () => {
          loadObjectives();
        }
      )
      .subscribe();

    // Subscribe to activity changes
    const activityChannel = supabase
      .channel('objective_activity_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'objective_activity'
        },
        (payload) => {
          if (selectedObjective && payload.new.objective_id === selectedObjective.id) {
            setActivity(prev => [payload.new as ActivityItem, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel('objective_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'objective_comments'
        },
        (payload) => {
          if (selectedObjective && payload.new.objective_id === selectedObjective.id) {
            if (payload.eventType === 'INSERT') {
              setComments(prev => [...prev, payload.new as Comment]);
            } else if (payload.eventType === 'DELETE') {
              setComments(prev => prev.filter(c => c.id !== payload.old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      objectivesChannel.unsubscribe();
      activityChannel.unsubscribe();
      commentsChannel.unsubscribe();
    };
  };

  const handleCreateObjective = async () => {
    if (!newObjectiveTitle.trim() || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('shared_objectives')
        .insert({
          title: newObjectiveTitle,
          description: newObjectiveDesc,
          created_by: currentUser.id,
          is_public: isPublic,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Objective created successfully!');
      setNewObjectiveTitle('');
      setNewObjectiveDesc('');
      setIsPublic(false);
      setShowNewObjective(false);
      loadObjectives();
    } catch (error) {
      console.error('Error creating objective:', error);
      toast.error('Failed to create objective');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedObjective || !currentUser) return;

    try {
      const { error } = await supabase
        .from('objective_comments')
        .insert({
          objective_id: selectedObjective.id,
          user_id: currentUser.id,
          content: newComment
        });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case 'editor':
        return <Edit3 className="w-3 h-3 text-blue-400" />;
      case 'viewer':
        return <Eye className="w-3 h-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role?: string) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  };

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <Lock className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-6">
          Please sign in to access shared objectives
        </p>
        <button
          onClick={() => toast.info('Authentication system will be implemented in Phase 6.1')}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 px-6 py-3 rounded-lg font-semibold transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Shared Objectives
            </h2>
            <p className="text-sm text-muted-foreground">
              Collaborate on objectives in real-time
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewObjective(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Objective
        </button>
      </div>

      {/* Create Objective Modal */}
      <AnimatePresence>
        {showNewObjective && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Shared Objective</h3>
              <button
                onClick={() => setShowNewObjective(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newObjectiveTitle}
                  onChange={(e) => setNewObjectiveTitle(e.target.value)}
                  placeholder="Enter objective title..."
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newObjectiveDesc}
                  onChange={(e) => setNewObjectiveDesc(e.target.value)}
                  placeholder="Describe your objective..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isPublic
                      ? 'bg-primary/20 border-primary/50'
                      : 'bg-white/5 border-white/10'
                  } border`}
                >
                  {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span className="text-sm">
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </button>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? 'Anyone can view this objective'
                    : 'Only you and invited collaborators can view'}
                </p>
              </div>
              <button
                onClick={handleCreateObjective}
                disabled={!newObjectiveTitle.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold transition-all"
              >
                Create Objective
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Objectives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading objectives...</p>
          </div>
        ) : objectives.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Shared Objectives Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first shared objective to start collaborating
            </p>
            <button
              onClick={() => setShowNewObjective(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 px-4 py-2 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Objective
            </button>
          </div>
        ) : (
          objectives.map((objective) => (
            <motion.div
              key={objective.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedObjective(objective)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{objective.title}</h3>
                  {objective.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {objective.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {objective.is_public ? (
                    <Globe className="w-4 h-4 text-green-400" title="Public" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" title="Private" />
                  )}
                  {objective.is_owner ? (
                    <Crown className="w-4 h-4 text-yellow-400" title="Owner" />
                  ) : (
                    getRoleIcon(objective.collaborator_role)
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    {objective.completed_task_count === objective.task_count && objective.task_count > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <Circle className="w-3 h-3" />
                    )}
                    {objective.completed_task_count}/{objective.task_count} tasks
                  </span>
                  {objective.collaborator_role && !objective.is_owner && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full">
                      {getRoleIcon(objective.collaborator_role)}
                      {getRoleLabel(objective.collaborator_role)}
                    </span>
                  )}
                </div>
                <span className="text-[10px]">
                  {new Date(objective.created_at).toLocaleDateString()}
                </span>
              </div>

              {objective.task_count > 0 && (
                <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(objective.completed_task_count / objective.task_count) * 100}%`
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Selected Objective Details */}
      <AnimatePresence>
        {selectedObjective && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">{selectedObjective.title}</h3>
              <button
                onClick={() => setSelectedObjective(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Activity Feed */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Recent Activity</h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  ) : (
                    activity.map((item) => (
                      <div
                        key={item.id}
                        className="text-sm bg-white/5 rounded-lg p-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              {item.action_type === 'created' && 'Objective created'}
                              {item.action_type === 'completed' && 'Objective completed'}
                              {item.action_type === 'task_added' && 'Task added'}
                              {item.action_type === 'task_completed' && 'Task completed'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Comments</h4>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-white/5 rounded-lg p-3"
                      >
                        <p className="text-sm mb-1">{comment.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
