import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Repeat, 
  BarChart3, 
  Zap, 
  GitBranch, 
  Brain, 
  MessageSquare, 
  Lightbulb, 
  Users, 
  Download, 
  FileText,
  Menu
} from 'lucide-react';

interface SlidingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  loopModeEnabled: boolean;
  onToggleLoopMode: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  showPredictions: boolean;
  onTogglePredictions: () => void;
  onOpenWhatIf: () => void;
  showLearningHistory: boolean;
  onToggleLearningHistory: () => void;
  showChatPlanner: boolean;
  onToggleChatPlanner: () => void;
  showKnowledgeBase: boolean;
  onToggleKnowledgeBase: () => void;
  showSharedBoard: boolean;
  onToggleSharedBoard: () => void;
  onOpenExport: () => void;
  onOpenPromptEditor: () => void;
}

export default function SlidingSidebar({
  isOpen,
  onClose,
  loopModeEnabled,
  onToggleLoopMode,
  showAnalytics,
  onToggleAnalytics,
  showPredictions,
  onTogglePredictions,
  onOpenWhatIf,
  showLearningHistory,
  onToggleLearningHistory,
  showChatPlanner,
  onToggleChatPlanner,
  showKnowledgeBase,
  onToggleKnowledgeBase,
  showSharedBoard,
  onToggleSharedBoard,
  onOpenExport,
  onOpenPromptEditor,
}: SlidingSidebarProps) {
  
  const menuItems = [
    {
      icon: Repeat,
      label: 'Loop Mode',
      subtitle: loopModeEnabled ? 'Auto-continues tasks' : 'Manual execution',
      active: loopModeEnabled,
      onClick: onToggleLoopMode,
      gradient: 'from-primary to-accent'
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      subtitle: 'View performance metrics',
      active: showAnalytics,
      onClick: onToggleAnalytics,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      label: 'Predictions',
      subtitle: 'AI-powered insights',
      active: showPredictions,
      onClick: onTogglePredictions,
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: GitBranch,
      label: 'What-If Simulator',
      subtitle: 'Explore scenarios',
      active: false,
      onClick: onOpenWhatIf,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Brain,
      label: 'Learning History',
      subtitle: 'Review past learnings',
      active: showLearningHistory,
      onClick: onToggleLearningHistory,
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      icon: MessageSquare,
      label: 'AI Chat Planner',
      subtitle: 'Conversational planning',
      active: showChatPlanner,
      onClick: onToggleChatPlanner,
      gradient: 'from-primary to-accent'
    },
    {
      icon: Lightbulb,
      label: 'Knowledge Base',
      subtitle: 'Stored insights',
      active: showKnowledgeBase,
      onClick: onToggleKnowledgeBase,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Users,
      label: 'Shared Objectives',
      subtitle: 'Collaborate with others',
      active: showSharedBoard,
      onClick: onToggleSharedBoard,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Download,
      label: 'Export Data',
      subtitle: 'Download objectives',
      active: false,
      onClick: onOpenExport,
      gradient: 'from-gray-500 to-gray-600'
    },
    {
      icon: FileText,
      label: 'Prompt Templates',
      subtitle: 'Customize AI prompts',
      active: false,
      onClick: onOpenPromptEditor,
      gradient: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#16001e] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-xl border-b border-white/10 p-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Menu className="w-5 h-5" />
                    Features Menu
                  </h2>
                  <p className="text-xs text-white/60 mt-1">Access all BabyAGI tools</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    item.onClick();
                    if (!item.active) {
                      onClose();
                    }
                  }}
                  className={`w-full p-4 rounded-xl transition-all text-left group ${
                    item.active
                      ? `bg-gradient-to-r ${item.gradient} shadow-lg`
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.active 
                        ? 'bg-white/20' 
                        : 'bg-white/10 group-hover:bg-white/20'
                    } transition-colors`}>
                      <item.icon className={`w-5 h-5 ${
                        item.active 
                          ? 'text-white' 
                          : 'text-white/70 group-hover:text-white'
                      } ${item.label === 'Loop Mode' && loopModeEnabled ? 'animate-spin' : ''}`}
                      style={item.label === 'Loop Mode' && loopModeEnabled ? { animationDuration: '3s' } : {}}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-sm ${
                          item.active ? 'text-white' : 'text-white/90'
                        }`}>
                          {item.label}
                        </h3>
                        {item.active && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse-glow"></span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${
                        item.active ? 'text-white/80' : 'text-white/50'
                      }`}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer Info */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#0a0118] via-[#0a0118] to-transparent p-4 border-t border-white/10">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/10">
                <p className="text-xs text-white/60 text-center">
                  <span className="font-semibold text-white">BabyAGI</span> - Autonomous Task Agent
                </p>
                <p className="text-xs text-white/40 text-center mt-1">
                  v1.0.0 • Built with AI
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
