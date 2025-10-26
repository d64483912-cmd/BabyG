import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, X, Plus, Minus, ArrowRight, Clock, AlertTriangle, 
  TrendingUp, Save, Trash2, Edit, RefreshCw 
} from 'lucide-react';
import { Objective, Task, AgentRole } from './BabyAGI';
import {
  Scenario,
  createScenario,
  addTaskToScenario,
  removeTaskFromScenario,
  modifyTaskPriority,
  changeAgentRole,
  compareScenarios,
  formatDuration,
  getScenarioImpact
} from '@/lib/scenario-utils';

interface WhatIfSimulatorProps {
  currentObjective: Objective | null;
  objectives: Objective[];
  onClose: () => void;
}

const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentObjective,
  objectives,
  onClose
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);

  // Create base scenario on mount
  useMemo(() => {
    if (currentObjective && scenarios.length === 0) {
      const baseScenario = createScenario(
        currentObjective,
        'Current Plan',
        'The current objective as-is',
        objectives
      );
      setScenarios([baseScenario]);
      setActiveScenarioId(baseScenario.id);
    }
  }, [currentObjective]);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const comparison = useMemo(() => compareScenarios(scenarios), [scenarios]);

  const handleCreateScenario = () => {
    if (!currentObjective) return;
    
    const newScenario = createScenario(
      currentObjective,
      `Scenario ${scenarios.length}`,
      'Custom scenario',
      objectives
    );
    
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const handleDeleteScenario = (scenarioId: string) => {
    if (scenarios.length <= 1) return; // Keep at least one scenario
    
    const newScenarios = scenarios.filter(s => s.id !== scenarioId);
    setScenarios(newScenarios);
    
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(newScenarios[0]?.id || null);
    }
  };

  const handleAddTask = () => {
    if (!activeScenario || !newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      status: 'pending',
      priority: 5,
      createdAt: Date.now()
    };
    
    const updatedScenario = addTaskToScenario(activeScenario, newTask, objectives);
    updateScenario(updatedScenario);
    setNewTaskTitle('');
    setShowNewTaskInput(false);
  };

  const handleRemoveTask = (taskId: string) => {
    if (!activeScenario) return;
    
    const updatedScenario = removeTaskFromScenario(activeScenario, taskId, objectives);
    updateScenario(updatedScenario);
  };

  const handleChangePriority = (taskId: string, newPriority: number) => {
    if (!activeScenario) return;
    
    const updatedScenario = modifyTaskPriority(activeScenario, taskId, newPriority, objectives);
    updateScenario(updatedScenario);
  };

  const handleChangeRole = (newRole: AgentRole) => {
    if (!activeScenario) return;
    
    const updatedScenario = changeAgentRole(activeScenario, newRole, objectives);
    updateScenario(updatedScenario);
  };

  const updateScenario = (updatedScenario: Scenario) => {
    setScenarios(scenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!currentObjective) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl p-8 max-w-md">
          <p className="text-white text-center">Please select an objective to simulate scenarios.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl p-6 max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-purple-300" />
            <h2 className="text-2xl font-bold text-white">What-If Simulator</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Scenarios List */}
          <div className="w-64 flex flex-col gap-3">
            <button
              onClick={handleCreateScenario}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all text-white font-medium"
            >
              <Plus className="w-4 h-4" />
              New Scenario
            </button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {scenarios.map((scenario, index) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    activeScenarioId === scenario.id
                      ? 'bg-white/20 border-2 border-purple-400'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setActiveScenarioId(scenario.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white text-sm">{scenario.name}</h3>
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                        className="p-1 hover:bg-red-500/30 rounded transition-colors text-white/50 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-white/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatDuration(scenario.prediction.totalEstimatedTime)}
                    </div>
                    <div className={`flex items-center gap-2 ${getRiskColor(scenario.prediction.riskLevel)}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {scenario.prediction.riskLevel} risk
                    </div>
                    {index > 0 && (
                      <div className="text-xs text-purple-300 mt-2">
                        {getScenarioImpact(scenario, scenarios[0])}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeScenario && (
              <>
                {/* Scenario Details */}
                <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{activeScenario.name}</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeScenario.modifiedObjective.agentRole || 'general'}
                        onChange={(e) => handleChangeRole(e.target.value as AgentRole)}
                        className="px-3 py-1 bg-white/10 rounded-lg text-white text-sm border border-white/20 focus:outline-none focus:border-purple-400"
                      >
                        <option value="general">General</option>
                        <option value="developer">Developer</option>
                        <option value="designer">Designer</option>
                        <option value="researcher">Researcher</option>
                        <option value="manager">Manager</option>
                        <option value="analyst">Analyst</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">Estimated Time</div>
                      <div className="text-lg font-bold text-white">
                        {formatDuration(activeScenario.prediction.totalEstimatedTime)}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">Risk Level</div>
                      <div className={`text-lg font-bold ${getRiskColor(activeScenario.prediction.riskLevel)}`}>
                        {activeScenario.prediction.riskLevel.toUpperCase()}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">Tasks</div>
                      <div className="text-lg font-bold text-white">
                        {activeScenario.modifiedObjective.tasks.length}
                      </div>
                    </div>
                  </div>

                  {activeScenario.modifications.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-2">Modifications:</div>
                      <div className="space-y-1">
                        {activeScenario.modifications.slice(-3).map((mod, i) => (
                          <div key={i} className="text-xs text-purple-300">
                            • {mod.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Tasks</h4>
                    <button
                      onClick={() => setShowNewTaskInput(!showNewTaskInput)}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-purple-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewTaskInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-3 flex gap-2"
                    >
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder="New task title..."
                        className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-purple-400"
                        autoFocus
                      />
                      <button
                        onClick={handleAddTask}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-white"
                      >
                        Add
                      </button>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    {activeScenario.modifiedObjective.tasks.map((task) => {
                      const prediction = activeScenario.prediction.taskPredictions.get(task.id);
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="text-white font-medium text-sm mb-1">{task.title}</div>
                              {prediction && (
                                <div className="text-xs text-white/60">
                                  Est. {formatDuration(prediction.estimatedDuration)}
                                  {' • '}
                                  {Math.round(prediction.confidenceScore * 100)}% confident
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveTask(task.id)}
                              className="p-1 hover:bg-red-500/30 rounded transition-colors text-white/50 hover:text-red-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60">Priority:</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={task.priority || 5}
                              onChange={(e) => handleChangePriority(task.id, parseInt(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-xs text-white w-6">{task.priority || 5}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Comparison Panel */}
          {scenarios.length > 1 && (
            <div className="w-80 bg-white/5 rounded-lg p-4 border border-white/10 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-300" />
                <h4 className="font-semibold text-white">Comparison</h4>
              </div>

              {/* Time Comparison */}
              <div className="mb-4">
                <div className="text-xs text-white/60 mb-2">Time Estimates:</div>
                <div className="space-y-2">
                  {scenarios.map((scenario, index) => (
                    <div key={scenario.id} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{scenario.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {formatDuration(scenario.prediction.totalEstimatedTime)}
                        </span>
                        {index > 0 && comparison.timeDeltas[index] !== 0 && (
                          <span className={comparison.timeDeltas[index] > 0 ? 'text-red-400' : 'text-green-400'}>
                            ({comparison.timeDeltas[index] > 0 ? '+' : ''}
                            {formatDuration(Math.abs(comparison.timeDeltas[index]))})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Comparison */}
              <div className="mb-4">
                <div className="text-xs text-white/60 mb-2">Risk Analysis:</div>
                <div className="space-y-2">
                  {comparison.riskComparison.map((risk, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-white/80">{scenarios[index].name}: </span>
                      <span className={getRiskColor(scenarios[index].prediction.riskLevel)}>
                        {risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {comparison.recommendations.length > 0 && (
                <div>
                  <div className="text-xs text-white/60 mb-2">Recommendations:</div>
                  <div className="space-y-2">
                    {comparison.recommendations.map((rec, index) => (
                      <div key={index} className="text-xs text-purple-300 bg-purple-500/10 rounded p-2">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhatIfSimulator;
