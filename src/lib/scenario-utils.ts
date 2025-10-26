import { Objective, Task, AgentRole } from '@/components/BabyAGI';
import { predictObjectiveCompletion, ObjectivePrediction } from './prediction-utils';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  baseObjective: Objective;
  modifiedObjective: Objective;
  prediction: ObjectivePrediction;
  createdAt: number;
  modifications: ScenarioModification[];
}

export interface ScenarioModification {
  type: 'add_task' | 'remove_task' | 'modify_task' | 'change_role' | 'change_priority' | 'reorder_tasks';
  description: string;
  taskId?: string;
  details: any;
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  timeDeltas: number[];
  riskComparison: string[];
  recommendations: string[];
}

// Create a new scenario from an objective
export function createScenario(
  objective: Objective,
  name: string,
  description: string,
  historicalObjectives: Objective[]
): Scenario {
  // Deep clone the objective
  const modifiedObjective = JSON.parse(JSON.stringify(objective)) as Objective;
  
  // Generate prediction
  const prediction = predictObjectiveCompletion(modifiedObjective, historicalObjectives);
  
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    description,
    baseObjective: objective,
    modifiedObjective,
    prediction,
    createdAt: Date.now(),
    modifications: []
  };
}

// Add a task to a scenario
export function addTaskToScenario(
  scenario: Scenario,
  task: Task,
  historicalObjectives: Objective[]
): Scenario {
  const newScenario = { ...scenario };
  newScenario.modifiedObjective = {
    ...newScenario.modifiedObjective,
    tasks: [...newScenario.modifiedObjective.tasks, task]
  };
  
  // Recalculate prediction
  newScenario.prediction = predictObjectiveCompletion(
    newScenario.modifiedObjective,
    historicalObjectives
  );
  
  // Record modification
  newScenario.modifications = [
    ...newScenario.modifications,
    {
      type: 'add_task',
      description: `Added task: ${task.title}`,
      taskId: task.id,
      details: { task }
    }
  ];
  
  return newScenario;
}

// Remove a task from a scenario
export function removeTaskFromScenario(
  scenario: Scenario,
  taskId: string,
  historicalObjectives: Objective[]
): Scenario {
  const newScenario = { ...scenario };
  const taskToRemove = newScenario.modifiedObjective.tasks.find(t => t.id === taskId);
  
  newScenario.modifiedObjective = {
    ...newScenario.modifiedObjective,
    tasks: newScenario.modifiedObjective.tasks.filter(t => t.id !== taskId)
  };
  
  // Recalculate prediction
  newScenario.prediction = predictObjectiveCompletion(
    newScenario.modifiedObjective,
    historicalObjectives
  );
  
  // Record modification
  if (taskToRemove) {
    newScenario.modifications = [
      ...newScenario.modifications,
      {
        type: 'remove_task',
        description: `Removed task: ${taskToRemove.title}`,
        taskId,
        details: { task: taskToRemove }
      }
    ];
  }
  
  return newScenario;
}

// Modify a task's priority
export function modifyTaskPriority(
  scenario: Scenario,
  taskId: string,
  newPriority: number,
  historicalObjectives: Objective[]
): Scenario {
  const newScenario = { ...scenario };
  const taskIndex = newScenario.modifiedObjective.tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) return scenario;
  
  const oldPriority = newScenario.modifiedObjective.tasks[taskIndex].priority || 5;
  const updatedTasks = [...newScenario.modifiedObjective.tasks];
  updatedTasks[taskIndex] = {
    ...updatedTasks[taskIndex],
    priority: newPriority
  };
  
  newScenario.modifiedObjective = {
    ...newScenario.modifiedObjective,
    tasks: updatedTasks
  };
  
  // Recalculate prediction
  newScenario.prediction = predictObjectiveCompletion(
    newScenario.modifiedObjective,
    historicalObjectives
  );
  
  // Record modification
  newScenario.modifications = [
    ...newScenario.modifications,
    {
      type: 'change_priority',
      description: `Changed priority of "${updatedTasks[taskIndex].title}" from ${oldPriority} to ${newPriority}`,
      taskId,
      details: { oldPriority, newPriority }
    }
  ];
  
  return newScenario;
}

// Change agent role
export function changeAgentRole(
  scenario: Scenario,
  newRole: AgentRole,
  historicalObjectives: Objective[]
): Scenario {
  const newScenario = { ...scenario };
  const oldRole = newScenario.modifiedObjective.agentRole || 'general';
  
  newScenario.modifiedObjective = {
    ...newScenario.modifiedObjective,
    agentRole: newRole
  };
  
  // Recalculate prediction
  newScenario.prediction = predictObjectiveCompletion(
    newScenario.modifiedObjective,
    historicalObjectives
  );
  
  // Record modification
  newScenario.modifications = [
    ...newScenario.modifications,
    {
      type: 'change_role',
      description: `Changed agent role from ${oldRole} to ${newRole}`,
      details: { oldRole, newRole }
    }
  ];
  
  return newScenario;
}

// Reorder tasks
export function reorderTasks(
  scenario: Scenario,
  taskIds: string[],
  historicalObjectives: Objective[]
): Scenario {
  const newScenario = { ...scenario };
  const taskMap = new Map(newScenario.modifiedObjective.tasks.map(t => [t.id, t]));
  const reorderedTasks = taskIds.map(id => taskMap.get(id)).filter(Boolean) as Task[];
  
  newScenario.modifiedObjective = {
    ...newScenario.modifiedObjective,
    tasks: reorderedTasks
  };
  
  // Recalculate prediction
  newScenario.prediction = predictObjectiveCompletion(
    newScenario.modifiedObjective,
    historicalObjectives
  );
  
  // Record modification
  newScenario.modifications = [
    ...newScenario.modifications,
    {
      type: 'reorder_tasks',
      description: `Reordered tasks`,
      details: { taskIds }
    }
  ];
  
  return newScenario;
}

// Compare multiple scenarios
export function compareScenarios(scenarios: Scenario[]): ScenarioComparison {
  if (scenarios.length === 0) {
    return {
      scenarios,
      timeDeltas: [],
      riskComparison: [],
      recommendations: []
    };
  }
  
  // Calculate time deltas (compared to first scenario)
  const baseTime = scenarios[0].prediction.totalEstimatedTime;
  const timeDeltas = scenarios.map(s => s.prediction.totalEstimatedTime - baseTime);
  
  // Compare risk levels
  const riskComparison = scenarios.map(s => {
    const riskLabel = s.prediction.riskLevel.toUpperCase();
    const taskCount = s.modifiedObjective.tasks.length;
    const bottleneckCount = s.prediction.bottlenecks.length;
    return `${riskLabel} (${taskCount} tasks, ${bottleneckCount} bottlenecks)`;
  });
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // Find fastest scenario
  const fastestIndex = timeDeltas.indexOf(Math.min(...timeDeltas));
  if (fastestIndex > 0) {
    recommendations.push(`Scenario "${scenarios[fastestIndex].name}" is the fastest option`);
  }
  
  // Find lowest risk scenario
  const riskScores = scenarios.map(s => {
    const riskMap = { low: 1, medium: 2, high: 3 };
    return riskMap[s.prediction.riskLevel];
  });
  const lowestRiskIndex = riskScores.indexOf(Math.min(...riskScores));
  if (lowestRiskIndex !== fastestIndex) {
    recommendations.push(`Scenario "${scenarios[lowestRiskIndex].name}" has the lowest risk`);
  }
  
  // Analyze modifications
  scenarios.forEach((scenario, index) => {
    if (index === 0) return; // Skip base scenario
    
    const addedTasks = scenario.modifications.filter(m => m.type === 'add_task').length;
    const removedTasks = scenario.modifications.filter(m => m.type === 'remove_task').length;
    
    if (removedTasks > 0 && timeDeltas[index] < 0) {
      recommendations.push(
        `Removing ${removedTasks} task(s) in "${scenario.name}" saves ` +
        `${formatDuration(-timeDeltas[index])}`
      );
    }
    
    if (addedTasks > 0 && scenario.prediction.riskLevel === 'low') {
      recommendations.push(
        `Adding ${addedTasks} task(s) in "${scenario.name}" is feasible with low risk`
      );
    }
  });
  
  return {
    scenarios,
    timeDeltas,
    riskComparison,
    recommendations
  };
}

// Format duration in human-readable format
export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `<1m`;
  }
}

// Get scenario impact summary
export function getScenarioImpact(scenario: Scenario, baseScenario: Scenario): string {
  const timeDiff = scenario.prediction.totalEstimatedTime - baseScenario.prediction.totalEstimatedTime;
  const taskDiff = scenario.modifiedObjective.tasks.length - baseScenario.modifiedObjective.tasks.length;
  
  const parts: string[] = [];
  
  if (timeDiff > 0) {
    parts.push(`+${formatDuration(timeDiff)} longer`);
  } else if (timeDiff < 0) {
    parts.push(`${formatDuration(-timeDiff)} faster`);
  } else {
    parts.push('Same duration');
  }
  
  if (taskDiff !== 0) {
    parts.push(`${taskDiff > 0 ? '+' : ''}${taskDiff} tasks`);
  }
  
  if (scenario.prediction.riskLevel !== baseScenario.prediction.riskLevel) {
    parts.push(`${scenario.prediction.riskLevel} risk`);
  }
  
  return parts.join(', ');
}
