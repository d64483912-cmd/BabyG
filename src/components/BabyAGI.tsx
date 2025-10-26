import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Sparkles, 
  Brain, 
  Zap, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Target,
  ListTodo,
  TrendingUp,
  X,
  Download,
  BarChart3,
  Loader2,
  Lightbulb,
  Repeat,
  MessageSquare,
  Code,
  Palette,
  Search,
  Briefcase,
  LineChart,
  Users,
  GitBranch,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Analytics from './Analytics';
import LearningHistory from './LearningHistory';
import ChatPlanner from './ChatPlanner';
import KnowledgeBase from './KnowledgeBase';
import SharedObjectivesBoard from './SharedObjectivesBoard';
import ExportModal from './ExportModal';
import PredictionInsights from './PredictionInsights';
import WhatIfSimulator from './WhatIfSimulator';
import PromptEditor from './PromptEditor';

// Types
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'executing' | 'completed';
  priority: number;
  createdAt: number;
  completedAt?: number;
  result?: string;
  category?: string;
  estimatedTime?: string;
  subtasks?: Task[];
  parentId?: string;
  isCollapsed?: boolean;
}

export type AgentRole = 'developer' | 'designer' | 'researcher' | 'manager' | 'analyst' | 'general';

export interface Objective {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  aiInsights?: string;
  agentRole?: AgentRole;
}

interface Store {
  objectives: Objective[];
  currentObjective: Objective | null;
  isProcessing: boolean;
  loopModeEnabled: boolean;
  addObjective: (title: string, description: string, agentRole?: AgentRole) => void;
  setCurrentObjective: (id: string) => void;
  deleteObjective: (id: string) => void;
  startProcessing: () => void;
  pauseProcessing: () => void;
  resetObjective: (id: string) => void;
  completeTask: (taskId: string) => void;
  toggleLoopMode: () => void;
  toggleTaskCollapse: (taskId: string) => void;
  addSubtask: (parentTaskId: string, subtaskTitle: string) => void;
}

// Zustand Store
const useStore = create<Store>()(
  persist(
    (set, get) => ({
      objectives: [],
      currentObjective: null,
      isProcessing: false,
      loopModeEnabled: false,
      
      addObjective: (title, description, agentRole = 'general') => {
        const newObjective: Objective = {
          id: Date.now().toString(),
          title,
          description,
          tasks: [],
          status: 'active',
          createdAt: Date.now(),
          agentRole,
        };
        set(state => ({
          objectives: [newObjective, ...state.objectives],
          currentObjective: newObjective,
        }));
      },
      
      setCurrentObjective: (id) => {
        const obj = get().objectives.find(o => o.id === id);
        if (obj) set({ currentObjective: obj });
      },
      
      deleteObjective: (id) => {
        set(state => ({
          objectives: state.objectives.filter(o => o.id !== id),
          currentObjective: state.currentObjective?.id === id ? null : state.currentObjective,
        }));
      },
      
      startProcessing: () => set({ isProcessing: true }),
      pauseProcessing: () => set({ isProcessing: false }),
      
      resetObjective: (id) => {
        set(state => ({
          objectives: state.objectives.map(obj => 
            obj.id === id 
              ? { ...obj, tasks: [], status: 'active' as const }
              : obj
          ),
          currentObjective: state.currentObjective?.id === id 
            ? { ...state.currentObjective, tasks: [], status: 'active' as const }
            : state.currentObjective,
        }));
      },
      
      completeTask: (taskId) => {
        set(state => {
          if (!state.currentObjective) return state;
          
          const updatedTasks = state.currentObjective.tasks.map(task =>
            task.id === taskId
              ? { ...task, status: 'completed' as const, completedAt: Date.now() }
              : task
          );
          
          const updatedObjective = { ...state.currentObjective, tasks: updatedTasks };
          
          return {
            currentObjective: updatedObjective,
            objectives: state.objectives.map(obj =>
              obj.id === state.currentObjective?.id ? updatedObjective : obj
            ),
          };
        });
      },
      
      toggleLoopMode: () => {
        set(state => ({ loopModeEnabled: !state.loopModeEnabled }));
      },
      
      toggleTaskCollapse: (taskId) => {
        set(state => {
          if (!state.currentObjective) return state;
          
          const toggleInTasks = (tasks: Task[]): Task[] => {
            return tasks.map(task => {
              if (task.id === taskId) {
                return { ...task, isCollapsed: !task.isCollapsed };
              }
              if (task.subtasks) {
                return { ...task, subtasks: toggleInTasks(task.subtasks) };
              }
              return task;
            });
          };
          
          const updatedTasks = toggleInTasks(state.currentObjective.tasks);
          const updatedObjective = { ...state.currentObjective, tasks: updatedTasks };
          
          return {
            currentObjective: updatedObjective,
            objectives: state.objectives.map(obj =>
              obj.id === state.currentObjective?.id ? updatedObjective : obj
            ),
          };
        });
      },
      
      addSubtask: (parentTaskId, subtaskTitle) => {
        set(state => {
          if (!state.currentObjective) return state;
          
          const newSubtask: Task = {
            id: `${Date.now()}-sub`,
            title: subtaskTitle,
            status: 'pending',
            priority: 1,
            createdAt: Date.now(),
            parentId: parentTaskId,
          };
          
          const addToTasks = (tasks: Task[]): Task[] => {
            return tasks.map(task => {
              if (task.id === parentTaskId) {
                return {
                  ...task,
                  subtasks: [...(task.subtasks || []), newSubtask],
                  isCollapsed: false, // Auto-expand when adding subtask
                };
              }
              if (task.subtasks) {
                return { ...task, subtasks: addToTasks(task.subtasks) };
              }
              return task;
            });
          };
          
          const updatedTasks = addToTasks(state.currentObjective.tasks);
          const updatedObjective = { ...state.currentObjective, tasks: updatedTasks };
          
          return {
            currentObjective: updatedObjective,
            objectives: state.objectives.map(obj =>
              obj.id === state.currentObjective?.id ? updatedObjective : obj
            ),
          };
        });
      },
    }),
    {
      name: 'babyagi-storage',
    }
  )
);

// Type for AI-generated task response
interface AITaskResponse {
  title: string;
  priority: number;
  category?: string;
  estimatedTime?: string;
}

// Agent role definitions with specialized prompts
const getAgentRolePrompt = (role: AgentRole): string => {
  const rolePrompts: Record<AgentRole, string> = {
    developer: "You are a senior software developer. Focus on technical implementation, code quality, testing, and best practices. Break down objectives into specific coding tasks, testing steps, and deployment considerations.",
    designer: "You are an expert UX/UI designer. Focus on user experience, visual design, accessibility, and design systems. Break down objectives into research, wireframing, prototyping, and user testing tasks.",
    researcher: "You are a thorough researcher and analyst. Focus on gathering information, analyzing data, synthesizing findings, and presenting insights. Break down objectives into research questions, data collection, analysis, and reporting tasks.",
    manager: "You are an experienced project manager. Focus on planning, coordination, risk management, and stakeholder communication. Break down objectives into milestones, dependencies, resource allocation, and progress tracking tasks.",
    analyst: "You are a data analyst and strategist. Focus on metrics, KPIs, data analysis, and strategic recommendations. Break down objectives into data gathering, analysis, visualization, and actionable insights tasks.",
    general: "You are a versatile AI assistant. Break down objectives into clear, actionable tasks with a balanced approach covering planning, execution, and validation."
  };
  return rolePrompts[role];
};

// AI-powered Task Generator with role-specific behavior
const generateTasksWithAI = async (objective: string, description: string, agentRole: AgentRole = 'general'): Promise<{ tasks: Task[], insights?: string }> => {
  try {
    const rolePrompt = getAgentRolePrompt(agentRole);
    const { data, error } = await supabase.functions.invoke('generate-tasks', {
      body: { 
        objective, 
        description,
        roleContext: rolePrompt,
        agentRole 
      }
    });

    if (error) throw error;

    if (data.error) {
      toast.error(data.error);
      return { tasks: [] };
    }

    const aiTasks: Task[] = data.tasks.map((task: AITaskResponse, index: number) => ({
      id: `${Date.now()}-${index}`,
      title: task.title,
      status: 'pending' as const,
      priority: task.priority,
      category: task.category,
      estimatedTime: task.estimatedTime,
      createdAt: Date.now() + index,
    }));

    return {
      tasks: aiTasks,
      insights: data.insights
    };
  } catch (error) {
    console.error('AI task generation failed:', error);
    toast.error('AI generation failed, using basic tasks');
    
    // Fallback to basic tasks
    const basicTasks: Task[] = [
      { id: `${Date.now()}-0`, title: `Research and gather information for: ${objective}`, status: 'pending', priority: 1, createdAt: Date.now() },
      { id: `${Date.now()}-1`, title: `Define success criteria for: ${objective}`, status: 'pending', priority: 2, createdAt: Date.now() + 1 },
      { id: `${Date.now()}-2`, title: `Create implementation plan for: ${objective}`, status: 'pending', priority: 3, createdAt: Date.now() + 2 },
      { id: `${Date.now()}-3`, title: `Execute core functionality for: ${objective}`, status: 'pending', priority: 4, createdAt: Date.now() + 3 },
      { id: `${Date.now()}-4`, title: `Test and validate: ${objective}`, status: 'pending', priority: 5, createdAt: Date.now() + 4 },
    ];
    
    return { tasks: basicTasks };
  }
};

// Main App Component
export default function BabyAGI() {
  const {
    objectives,
    currentObjective,
    isProcessing,
    loopModeEnabled,
    addObjective,
    setCurrentObjective,
    deleteObjective,
    startProcessing,
    pauseProcessing,
    resetObjective,
    completeTask,
    toggleLoopMode,
    toggleTaskCollapse,
    addSubtask,
  } = useStore();
  
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('general');
  const [expandedStats, setExpandedStats] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLearningHistory, setShowLearningHistory] = useState(false);
  const [showChatPlanner, setShowChatPlanner] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showSharedBoard, setShowSharedBoard] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showWhatIfSimulator, setShowWhatIfSimulator] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [learnedContext, setLearnedContext] = useState<string>('');

  // Auto-processing effect
  useEffect(() => {
    if (!isProcessing || !currentObjective) return;
    
    const pendingTasks = currentObjective.tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) {
      pauseProcessing();
      
      // Trigger reflection when all tasks are completed - removed for now to fix dependency issue
      // Will be handled separately
      return;
    }
    
    const nextTask = pendingTasks[0];
    const taskIndex = currentObjective.tasks.findIndex(t => t.id === nextTask.id);
    
    // Update task to executing
    useStore.setState(state => {
      if (!state.currentObjective) return state;
      const updatedTasks = [...state.currentObjective.tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'executing' };
      const updatedObjective = { ...state.currentObjective, tasks: updatedTasks };
      return {
        currentObjective: updatedObjective,
        objectives: state.objectives.map(obj =>
          obj.id === state.currentObjective?.id ? updatedObjective : obj
        ),
      };
    });
    
    // Simulate task execution
    const timer = setTimeout(() => {
      completeTask(nextTask.id);
    }, 2000 + Math.random() * 2000);
    
    return () => clearTimeout(timer);
  }, [isProcessing, currentObjective, completeTask, pauseProcessing]);

  const fetchLearnedInsights = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-learned-insights', {
        body: { objectiveTitle: newTitle }
      });
      
      if (error) throw error;
      
      if (data?.contextForAI) {
        setLearnedContext(data.contextForAI);
      }
    } catch (error) {
      console.error('Failed to fetch learned insights:', error);
    }
  }, [newTitle]);

  // Fetch learned insights when title changes
  useEffect(() => {
    if (newTitle.length > 3 && showNewObjective) {
      fetchLearnedInsights();
    }
  }, [newTitle, showNewObjective, fetchLearnedInsights]);

  
  const handleCreateObjective = async () => {
    if (!newTitle.trim()) return;
    
    setIsGenerating(true);
    addObjective(newTitle, newDescription, selectedAgentRole);
    
    // Generate tasks with AI
    const current = useStore.getState().currentObjective;
    if (current) {
      const { tasks, insights } = await generateTasksWithAI(newTitle, newDescription, selectedAgentRole);
      
      useStore.setState(state => ({
        currentObjective: { ...current, tasks, aiInsights: insights },
        objectives: state.objectives.map(obj =>
          obj.id === current.id ? { ...obj, tasks, aiInsights: insights } : obj
        ),
      }));
      
      if (insights) {
        toast.success('AI generated smart task breakdown!');
      }
    }
    
    setIsGenerating(false);
    setNewTitle('');
    setNewDescription('');
    setSelectedAgentRole('general');
    setShowNewObjective(false);
  };
  
  const handleReflectionAndContinue = useCallback(async (objective: Objective) => {
    try {
      // First, reflect on the completed objective
      const { data, error } = await supabase.functions.invoke('reflect-on-objective', {
        body: {
          objectiveId: objective.id,
          objectiveTitle: objective.title,
          tasks: objective.tasks
        }
      });
      
      if (error) {
        console.error('Reflection failed:', error);
      }
      
      if (data?.reflection) {
        toast.success('Objective completed! Learning captured for future tasks.');
        
        // Store key insights in knowledge base
        if (data.reflection.insights || data.reflection.what_worked || data.reflection.recommendations) {
          const knowledgeContent = [
            data.reflection.what_worked && `What worked: ${data.reflection.what_worked}`,
            data.reflection.what_didnt_work && `What to improve: ${data.reflection.what_didnt_work}`,
            data.reflection.recommendations && `Recommendations: ${data.reflection.recommendations}`
          ].filter(Boolean).join('\n\n');
          
          if (knowledgeContent) {
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
        }
      }
      
      // If loop mode is enabled, auto-generate next objective
      if (loopModeEnabled) {
        await autoGenerateNextObjective(objective);
      }
    } catch (error) {
      console.error('Error during reflection:', error);
    }
  }, [loopModeEnabled]);
  
  const autoGenerateNextObjective = async (completedObjective: Objective) => {
    try {
      toast.info('Loop Mode: Evaluating and generating next objective...');
      
      // Get learned insights to inform the next objective
      const { data: insightsData, error: insightsError } = await supabase.functions.invoke('get-learned-insights', {
        body: { objectiveTitle: completedObjective.title }
      });
      
      if (insightsError) {
        console.error('Failed to get insights:', insightsError);
      }
      
      // Generate a new objective based on learned patterns
      const nextObjectiveTitle = `Continue: ${completedObjective.title} - Next Phase`;
      const nextObjectiveDescription = `Auto-generated follow-up based on completed objective. ${insightsData?.contextForAI || ''}`;
      
      // Add slight delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create the new objective (maintain the same role as previous objective)
      const previousRole = completedObjective.agentRole || 'general';
      addObjective(nextObjectiveTitle, nextObjectiveDescription, previousRole);
      
      // Generate tasks with AI
      const current = useStore.getState().currentObjective;
      if (current) {
        setIsGenerating(true);
        const { tasks, insights } = await generateTasksWithAI(nextObjectiveTitle, nextObjectiveDescription, previousRole);
        
        useStore.setState(state => ({
          currentObjective: { ...current, tasks, aiInsights: insights },
          objectives: state.objectives.map(obj =>
            obj.id === current.id ? { ...obj, tasks, aiInsights: insights } : obj
          ),
        }));
        
        if (insights) {
          toast.success('Loop Mode: New objective generated! Starting automatically...');
        }
        
        setIsGenerating(false);
        
        // Auto-start the new objective
        await new Promise(resolve => setTimeout(resolve, 1000));
        startProcessing();
      }
    } catch (error) {
      console.error('Error generating next objective:', error);
      toast.error('Loop Mode: Failed to generate next objective');
    }
  };

  // Export functionality now handled by ExportModal

  const stats = currentObjective ? {
    total: currentObjective.tasks.length,
    completed: currentObjective.tasks.filter(t => t.status === 'completed').length,
    executing: currentObjective.tasks.filter(t => t.status === 'executing').length,
    pending: currentObjective.tasks.filter(t => t.status === 'pending').length,
  } : null;

  // Agent role configuration
  const agentRoles: Array<{ value: AgentRole; label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = [
    { value: 'general', label: 'General', icon: Users, color: 'from-gray-500 to-gray-600', description: 'Versatile AI assistant' },
    { value: 'developer', label: 'Developer', icon: Code, color: 'from-blue-500 to-cyan-500', description: 'Technical implementation' },
    { value: 'designer', label: 'Designer', icon: Palette, color: 'from-pink-500 to-rose-500', description: 'UX/UI design' },
    { value: 'researcher', label: 'Researcher', icon: Search, color: 'from-purple-500 to-indigo-500', description: 'Research & analysis' },
    { value: 'manager', label: 'Manager', icon: Briefcase, color: 'from-orange-500 to-amber-500', description: 'Project management' },
    { value: 'analyst', label: 'Analyst', icon: LineChart, color: 'from-green-500 to-emerald-500', description: 'Data & strategy' },
  ];

  const getRoleConfig = (role: AgentRole) => agentRoles.find(r => r.value === role) || agentRoles[0];

  // Recursive Task Item Component
  const TaskItem: React.FC<{ task: Task; index: number; depth?: number }> = ({ task, index, depth = 0 }) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const paddingLeft = depth * 24; // Indent by 24px per level
    
    return (
      <>
        <motion.div
          key={task.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.05 }}
          className={`
            bg-white/5 backdrop-blur-lg rounded-xl p-4 border transition-all
            ${task.status === 'completed' ? 'border-green-500/30' : 
              task.status === 'executing' ? 'border-yellow-500/30' : 
              'border-white/10'}
          `}
          style={{ marginLeft: `${paddingLeft}px` }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {task.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : task.status === 'executing' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-5 h-5 text-yellow-400" />
                </motion.div>
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {hasSubtasks && (
                      <button
                        onClick={() => toggleTaskCollapse(task.id)}
                        className="p-0.5 hover:bg-white/10 rounded transition-all"
                      >
                        <motion.div
                          animate={{ rotate: task.isCollapsed ? 0 : 90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </motion.div>
                      </button>
                    )}
                    <h3 className={`text-sm font-medium break-words ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {task.title}
                    </h3>
                    {hasSubtasks && (
                      <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                        {task.subtasks!.filter(st => st.status === 'completed').length}/{task.subtasks!.length}
                      </span>
                    )}
                  </div>
                  {(task.category || task.estimatedTime) && (
                    <div className="flex items-center gap-2 mt-1">
                      {task.category && (
                        <span className="text-xs bg-accent/20 px-2 py-0.5 rounded-full">
                          {task.category}
                        </span>
                      )}
                      {task.estimatedTime && (
                        <span className="text-xs text-muted-foreground">
                          ~{task.estimatedTime}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs bg-primary/20 px-2 py-1 rounded-full whitespace-nowrap">
                  P{task.priority}
                </span>
              </div>
              
              {task.status === 'executing' && (
                <div className="mt-2 w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'linear' }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Render subtasks recursively */}
        {hasSubtasks && !task.isCollapsed && (
          <AnimatePresence mode="popLayout">
            {task.subtasks!.map((subtask, subIndex) => (
              <TaskItem
                key={subtask.id}
                task={subtask}
                index={subIndex}
                depth={depth + 1}
              />
            ))}
          </AnimatePresence>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Brain className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">BabyAGI</h1>
                <p className="text-xs text-primary/70">Autonomous Task Agent</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLoopMode}
                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  loopModeEnabled 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/50' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title={loopModeEnabled ? "Loop Mode: ON - Auto-continues after completion" : "Loop Mode: OFF"}
              >
                <Repeat className={`w-4 h-4 ${loopModeEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                {loopModeEnabled && (
                  <span className="text-xs font-semibold hidden md:inline">LOOP</span>
                )}
              </button>
              
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                title="Analytics"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowPredictions(!showPredictions)}
                className={`px-3 py-2 rounded-lg transition-all ${
                  showPredictions 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/50' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title="Predictive Insights"
              >
                <Zap className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowWhatIfSimulator(true)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                title="What-If Simulator"
              >
                <GitBranch className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowLearningHistory(!showLearningHistory)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                title="Learning History"
              >
                <Brain className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowChatPlanner(!showChatPlanner)}
                className={`px-3 py-2 rounded-lg transition-all ${
                  showChatPlanner 
                    ? 'bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/50' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title="AI Chat Planner"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              
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
              
              <button
                onClick={() => setShowSharedBoard(!showSharedBoard)}
                className={`px-3 py-2 rounded-lg transition-all ${
                  showSharedBoard 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title="Shared Objectives"
              >
                <Users className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowPromptEditor(true)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                title="Prompt Templates"
              >
                <FileText className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowNewObjective(true)}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                New Goal
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Loop Mode Banner */}
        <AnimatePresence>
          {loopModeEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 backdrop-blur-lg rounded-xl border border-primary/30 p-4 shadow-lg shadow-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                  <Repeat className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    Continuous Loop Mode Active
                    <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse-glow"></span>
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    BabyAGI will automatically evaluate completed objectives and generate follow-up tasks using learned insights.
                  </p>
                </div>
                <button
                  onClick={toggleLoopMode}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  Disable
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Analytics Panel */}
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Analytics objectives={objectives} />
          </motion.div>
        )}
        
        {/* Prediction Insights Panel */}
        {showPredictions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <PredictionInsights 
              currentObjective={currentObjective}
              objectives={objectives}
            />
          </motion.div>
        )}
        
        {/* Learning History Panel */}
        {showLearningHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <LearningHistory currentObjectiveTitle={currentObjective?.title} />
          </motion.div>
        )}
        
        {/* Chat Planner Panel */}
        {showChatPlanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <ChatPlanner 
              onCreateObjective={(title, description) => {
                addObjective(title, description, 'general');
                const current = useStore.getState().currentObjective;
                if (current) {
                  setIsGenerating(true);
                  generateTasksWithAI(title, description, 'general').then(({ tasks, insights }) => {
                    useStore.setState(state => ({
                      currentObjective: { ...current, tasks, aiInsights: insights },
                      objectives: state.objectives.map(obj =>
                        obj.id === current.id ? { ...obj, tasks, aiInsights: insights } : obj
                      ),
                    }));
                    setIsGenerating(false);
                    setShowChatPlanner(false);
                  });
                }
              }}
              onClose={() => setShowChatPlanner(false)}
            />
          </motion.div>
        )}
        
        {/* Knowledge Base Panel */}
        {showKnowledgeBase && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <KnowledgeBase 
              autoSearchQuery={currentObjective?.title}
              onSelectKnowledge={(knowledge) => {
                toast.info(`Selected: ${knowledge.title}`);
              }}
            />
          </motion.div>
        )}
        
        {/* Shared Objectives Board */}
        {showSharedBoard && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6"
          >
            <SharedObjectivesBoard />
          </motion.div>
        )}
        
        {/* Export Modal */}
        <AnimatePresence>
          {showExportModal && (
            <ExportModal
              objectives={objectives}
              onClose={() => setShowExportModal(false)}
            />
          )}
        </AnimatePresence>
        
        {/* What-If Simulator */}
        <AnimatePresence>
          {showWhatIfSimulator && (
            <WhatIfSimulator
              currentObjective={currentObjective}
              objectives={objectives}
              onClose={() => setShowWhatIfSimulator(false)}
            />
          )}
        </AnimatePresence>
        
        {/* Prompt Editor */}
        <AnimatePresence>
          {showPromptEditor && (
            <PromptEditor
              onClose={() => setShowPromptEditor(false)}
              onApplyTemplate={(template) => {
                toast.success(`Template "${template.name}" is now active for new objectives`);
              }}
            />
          )}
        </AnimatePresence>

        {/* Stats Panel */}
        {currentObjective && stats && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setExpandedStats(!expandedStats)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold">Current Objective</span>
              </div>
              {expandedStats ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {expandedStats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold">{currentObjective.title}</h3>
                      {currentObjective.agentRole && (() => {
                        const roleConfig = getRoleConfig(currentObjective.agentRole);
                        const RoleIcon = roleConfig.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${roleConfig.color} text-white`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </span>
                        );
                      })()}
                    </div>
                    {currentObjective.description && (
                      <p className="text-sm text-muted-foreground">{currentObjective.description}</p>
                    )}
                    {currentObjective.aiInsights && (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
                        <p className="text-xs text-primary/80 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{currentObjective.aiInsights}</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="bg-green-500/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{stats.completed}</div>
                        <div className="text-xs text-muted-foreground">Done</div>
                      </div>
                      <div className="bg-yellow-500/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{stats.executing}</div>
                        <div className="text-xs text-muted-foreground">Running</div>
                      </div>
                      <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.completed / stats.total) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    
                    {/* Controls */}
                    <div className="flex gap-2 mt-4">
                      {!isProcessing ? (
                        <button
                          onClick={startProcessing}
                          disabled={stats.pending === 0}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-muted disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      ) : (
                        <button
                          onClick={pauseProcessing}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => resetObjective(currentObjective.id)}
                        className="bg-destructive/20 hover:bg-destructive/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Task List */}
        {currentObjective && currentObjective.tasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Task Queue</h2>
            </div>
            
            <AnimatePresence mode="popLayout">
              {currentObjective.tasks.map((task, index) => (
                <TaskItem key={task.id} task={task} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!currentObjective && objectives.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Brain className="w-20 h-20 mx-auto mb-4 text-primary/50" />
            <h2 className="text-2xl font-bold mb-2">No Active Objectives</h2>
            <p className="text-muted-foreground mb-6">Create your first objective to get started</p>
            <button
              onClick={() => setShowNewObjective(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Create Objective
            </button>
          </motion.div>
        )}

        {/* All Objectives List */}
        {objectives.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">All Objectives</h2>
            </div>
            
            <div className="space-y-2">
              {objectives.map(obj => (
                <motion.div
                  key={obj.id}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    bg-white/5 backdrop-blur-lg rounded-xl p-4 border cursor-pointer transition-all hover:bg-white/10
                    ${currentObjective?.id === obj.id ? 'border-primary/50' : 'border-white/10'}
                  `}
                  onClick={() => setCurrentObjective(obj.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{obj.title}</h3>
                        {obj.agentRole && (() => {
                          const roleConfig = getRoleConfig(obj.agentRole);
                          const RoleIcon = roleConfig.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${roleConfig.color} text-white`}>
                              <RoleIcon className="w-2.5 h-2.5" />
                              {roleConfig.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {obj.tasks.filter(t => t.status === 'completed').length}/{obj.tasks.length} tasks
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteObjective(obj.id);
                      }}
                      className="ml-2 p-2 hover:bg-destructive/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New Objective Modal */}
      <AnimatePresence>
        {showNewObjective && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowNewObjective(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card backdrop-blur-xl rounded-2xl border border-white/10 p-6 z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  New Objective
                </h2>
                <button
                  onClick={() => setShowNewObjective(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Build a landing page"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Optional: Add more context about your objective"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  />
                </div>
                
                {/* Agent Role Selector */}
                <div>
                  <label className="block text-sm font-medium mb-3">AI Agent Role</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {agentRoles.map((role) => {
                      const Icon = role.icon;
                      const isSelected = selectedAgentRole === role.value;
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setSelectedAgentRole(role.value)}
                          className={`
                            relative p-3 rounded-lg border transition-all text-left
                            ${
                              isSelected
                                ? 'border-primary/50 bg-gradient-to-br ' + role.color + ' bg-opacity-10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`p-1.5 rounded-md bg-gradient-to-br ${role.color}`}>
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold">{role.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{role.description}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* AI Learned Insights */}
                {learnedContext && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold mb-1">AI Insights from Past Work:</p>
                        <p className="text-muted-foreground whitespace-pre-line">{learnedContext}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateObjective}
                    disabled={!newTitle.trim() || isGenerating}
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating AI Tasks...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Create with AI
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowNewObjective(false)}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
