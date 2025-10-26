import { Task, Objective, AgentRole } from '@/components/BabyAGI';

export interface TaskPrediction {
  estimatedDuration: number; // in milliseconds
  confidenceScore: number; // 0-1
  factors: string[];
  similarTaskCount: number;
}

export interface ObjectivePrediction {
  totalEstimatedTime: number; // in milliseconds
  completionDate: Date;
  taskPredictions: Map<string, TaskPrediction>;
  riskLevel: 'low' | 'medium' | 'high';
  bottlenecks: string[];
}

// Simple linear regression for time prediction
class LinearRegression {
  private slope: number = 0;
  private intercept: number = 0;
  
  fit(X: number[], y: number[]): void {
    if (X.length !== y.length || X.length === 0) {
      throw new Error('Invalid training data');
    }
    
    const n = X.length;
    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((sum, x, i) => sum + x * y[i], 0);
    const sumX2 = X.reduce((sum, x) => sum + x * x, 0);
    
    this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;
  }
  
  predict(x: number): number {
    return this.slope * x + this.intercept;
  }
}

// Feature extraction from task
function extractTaskFeatures(task: Task): { features: number[]; labels: string[] } {
  return {
    features: [
      task.title.length,
      task.priority || 5,
      task.category ? getCategoryComplexity(task.category) : 3,
      (task.subtasks?.length || 0) * 2
    ],
    labels: ['titleLength', 'priority', 'categoryComplexity', 'subtaskCount']
  };
}

function getCategoryComplexity(category: string): number {
  const complexityMap: Record<string, number> = {
    'research': 4,
    'planning': 3,
    'execution': 6,
    'testing': 5,
    'documentation': 2,
    'optimization': 7
  };
  return complexityMap[category.toLowerCase()] || 4;
}

function getAgentSpeedMultiplier(role?: AgentRole): number {
  const multipliers: Record<AgentRole, number> = {
    'developer': 0.9,
    'designer': 1.1,
    'researcher': 1.3,
    'manager': 0.8,
    'analyst': 1.0,
    'general': 1.0
  };
  return multipliers[role || 'general'];
}

// Predict single task completion time
export function predictTaskCompletionTime(
  task: Task,
  historicalTasks: Task[],
  agentRole?: AgentRole
): TaskPrediction {
  // Filter completed historical tasks with timing data
  const completedTasks = historicalTasks.filter(
    t => t.status === 'completed' && t.completedAt && t.createdAt
  );
  
  if (completedTasks.length < 3) {
    // Insufficient data, use heuristic estimation
    return getHeuristicEstimate(task, agentRole);
  }
  
  // Extract features from current task
  const { features: currentFeatures } = extractTaskFeatures(task);
  
  // Find similar tasks
  const similarTasks = completedTasks
    .map(historicalTask => {
      const { features: histFeatures } = extractTaskFeatures(historicalTask);
      const similarity = calculateSimilarity(currentFeatures, histFeatures);
      return { task: historicalTask, similarity };
    })
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
  
  if (similarTasks.length === 0) {
    return getHeuristicEstimate(task, agentRole);
  }
  
  // Calculate average completion time from similar tasks
  const durations = similarTasks.map(item => 
    item.task.completedAt! - item.task.createdAt
  );
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const stdDev = Math.sqrt(
    durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
  );
  
  // Apply agent role multiplier
  const speedMultiplier = getAgentSpeedMultiplier(agentRole);
  const estimatedDuration = avgDuration * speedMultiplier;
  
  // Calculate confidence based on sample size and variance
  const sampleConfidence = Math.min(similarTasks.length / 10, 1);
  const varianceConfidence = Math.max(0, 1 - (stdDev / avgDuration));
  const confidenceScore = (sampleConfidence + varianceConfidence) / 2;
  
  // Determine key factors
  const factors = [];
  if (task.priority && task.priority <= 3) factors.push('High priority');
  if (task.category) factors.push(`${task.category} task`);
  if (task.subtasks && task.subtasks.length > 0) factors.push(`${task.subtasks.length} subtasks`);
  if (similarTasks.length >= 5) factors.push('Strong historical data');
  
  return {
    estimatedDuration,
    confidenceScore,
    factors,
    similarTaskCount: similarTasks.length
  };
}

// Heuristic estimation when insufficient historical data
function getHeuristicEstimate(task: Task, agentRole?: AgentRole): TaskPrediction {
  let baseDuration = 180000; // 3 minutes base
  
  // Adjust based on title length (complexity proxy)
  baseDuration += task.title.length * 50;
  
  // Adjust based on priority (higher priority = more attention = longer)
  if (task.priority) {
    baseDuration += (11 - task.priority) * 30000;
  }
  
  // Adjust based on category
  if (task.category) {
    const categoryMultipliers: Record<string, number> = {
      'research': 1.5,
      'planning': 1.2,
      'execution': 1.8,
      'testing': 1.4,
      'documentation': 1.0,
      'optimization': 2.0
    };
    baseDuration *= categoryMultipliers[task.category.toLowerCase()] || 1.3;
  }
  
  // Adjust for subtasks
  if (task.subtasks && task.subtasks.length > 0) {
    baseDuration *= (1 + task.subtasks.length * 0.3);
  }
  
  // Apply agent role multiplier
  baseDuration *= getAgentSpeedMultiplier(agentRole);
  
  return {
    estimatedDuration: baseDuration,
    confidenceScore: 0.4, // Low confidence for heuristic
    factors: ['Heuristic estimation', 'Insufficient historical data'],
    similarTaskCount: 0
  };
}

// Calculate cosine similarity between feature vectors
function calculateSimilarity(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) return 0;
  
  const dotProduct = features1.reduce((sum, f1, i) => sum + f1 * features2[i], 0);
  const magnitude1 = Math.sqrt(features1.reduce((sum, f) => sum + f * f, 0));
  const magnitude2 = Math.sqrt(features2.reduce((sum, f) => sum + f * f, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

// Predict entire objective completion
export function predictObjectiveCompletion(
  objective: Objective,
  historicalObjectives: Objective[]
): ObjectivePrediction {
  // Get all completed tasks from historical objectives
  const allHistoricalTasks = historicalObjectives.flatMap(obj => obj.tasks);
  
  const taskPredictions = new Map<string, TaskPrediction>();
  let totalEstimatedTime = 0;
  let highRiskTasks = 0;
  const bottlenecks: string[] = [];
  
  // Predict each task
  objective.tasks.forEach(task => {
    const prediction = predictTaskCompletionTime(task, allHistoricalTasks, objective.agentRole);
    taskPredictions.set(task.id, prediction);
    totalEstimatedTime += prediction.estimatedDuration;
    
    // Identify high-risk tasks (low confidence or long duration)
    if (prediction.confidenceScore < 0.5 || prediction.estimatedDuration > 600000) {
      highRiskTasks++;
      if (prediction.estimatedDuration > 900000) { // 15+ minutes
        bottlenecks.push(task.title);
      }
    }
  });
  
  // Account for task dependencies (sequential execution)
  // Add 20% overhead for context switching
  totalEstimatedTime *= 1.2;
  
  // Calculate expected completion date
  const completionDate = new Date(Date.now() + totalEstimatedTime);
  
  // Determine risk level
  const riskRatio = highRiskTasks / Math.max(objective.tasks.length, 1);
  const riskLevel: 'low' | 'medium' | 'high' = 
    riskRatio > 0.5 ? 'high' :
    riskRatio > 0.25 ? 'medium' : 'low';
  
  return {
    totalEstimatedTime,
    completionDate,
    taskPredictions,
    riskLevel,
    bottlenecks: bottlenecks.slice(0, 3) // Top 3 bottlenecks
  };
}

// Format duration for display
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Get velocity metrics (tasks completed per day)
export function calculateVelocity(objectives: Objective[], days: number = 7): {
  tasksPerDay: number;
  objectivesPerWeek: number;
  avgTaskDuration: number;
} {
  const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const recentObjectives = objectives.filter(obj => obj.createdAt >= cutoffDate);
  const completedTasks = recentObjectives.flatMap(obj => 
    obj.tasks.filter(t => t.status === 'completed' && t.completedAt && t.createdAt)
  );
  
  const tasksPerDay = completedTasks.length / days;
  const objectivesPerWeek = (recentObjectives.filter(obj => 
    obj.status === 'completed'
  ).length / days) * 7;
  
  const avgTaskDuration = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + (t.completedAt! - t.createdAt), 0) / completedTasks.length
    : 0;
  
  return {
    tasksPerDay,
    objectivesPerWeek,
    avgTaskDuration
  };
}
