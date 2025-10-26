import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  Calendar,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Objective } from './BabyAGI';
import {
  predictObjectiveCompletion,
  calculateVelocity,
  formatDuration
} from '@/lib/prediction-utils';

interface PredictionInsightsProps {
  currentObjective: Objective | null;
  objectives: Objective[];
}

export default function PredictionInsights({ currentObjective, objectives }: PredictionInsightsProps) {
  const prediction = useMemo(() => {
    if (!currentObjective) return null;
    return predictObjectiveCompletion(currentObjective, objectives);
  }, [currentObjective, objectives]);

  const velocity = useMemo(() => {
    return calculateVelocity(objectives, 7);
  }, [objectives]);

  if (!currentObjective || !prediction) {
    return (
      <div className="text-center py-12 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
        <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Active Objective</h3>
        <p className="text-sm text-muted-foreground">
          Create an objective to see predictions
        </p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-muted-foreground bg-white/5 border-white/10';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle2 className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const completedTasks = currentObjective.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = currentObjective.tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
          <Zap className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Predictive Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            ML-powered completion estimates
          </p>
        </div>
      </div>

      {/* Main Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estimated Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-medium text-sm">Estimated Time</h3>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-blue-400">
              {formatDuration(prediction.totalEstimatedTime)}
            </p>
            <p className="text-xs text-muted-foreground">
              Based on {objectives.length} historical objectives
            </p>
          </div>
        </motion.div>

        {/* Completion Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-medium text-sm">Expected Completion</h3>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-purple-400">
              {prediction.completionDate.toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {prediction.completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </motion.div>

        {/* Risk Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`backdrop-blur-lg rounded-xl border p-5 ${getRiskColor(prediction.riskLevel)}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-current/20 rounded-lg">
              {getRiskIcon(prediction.riskLevel)}
            </div>
            <h3 className="font-medium text-sm">Risk Level</h3>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold capitalize">
              {prediction.riskLevel}
            </p>
            <p className="text-xs opacity-80">
              {prediction.riskLevel === 'low' && 'On track for completion'}
              {prediction.riskLevel === 'medium' && 'Some uncertainties remain'}
              {prediction.riskLevel === 'high' && 'Multiple risk factors'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottlenecks */}
      {prediction.bottlenecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-500/10 backdrop-blur-lg rounded-xl border border-orange-500/20 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="font-medium">Potential Bottlenecks</h3>
          </div>
          <div className="space-y-2">
            {prediction.bottlenecks.map((bottleneck, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                <span className="text-orange-300">{bottleneck}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-400/60 mt-3">
            These tasks may take longer than average
          </p>
        </motion.div>
      )}

      {/* Velocity Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="font-medium">Your Velocity (Last 7 Days)</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-green-400">
              {velocity.tasksPerDay.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tasks/Day</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {velocity.objectivesPerWeek.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Objectives/Week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {formatDuration(velocity.avgTaskDuration)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg Task Time</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar with Prediction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-sm">Progress</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-2">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started {new Date(currentObjective.createdAt).toLocaleDateString()}</span>
          <span>Est. completion {prediction.completionDate.toLocaleDateString()}</span>
        </div>
      </motion.div>

      {/* Task Predictions Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5"
      >
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Task Predictions
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {currentObjective.tasks.map((task) => {
            const taskPrediction = prediction.taskPredictions.get(task.id);
            if (!taskPrediction || task.status === 'completed') return null;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between text-sm bg-white/5 rounded-lg p-3"
              >
                <span className="flex-1 truncate">{task.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    ~{formatDuration(taskPrediction.estimatedDuration)}
                  </span>
                  <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${taskPrediction.confidenceScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
