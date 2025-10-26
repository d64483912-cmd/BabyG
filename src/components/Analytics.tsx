import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, CheckCircle2, TrendingUp, Brain, ListChecks, Calendar, Zap, PieChart, Activity } from 'lucide-react';
import { Objective } from './BabyAGI';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsProps {
  objectives: Objective[];
}

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const Analytics: React.FC<AnalyticsProps> = ({ objectives }) => {
  const [activeView, setActiveView] = useState<'overview' | 'burndown' | 'velocity' | 'categories'>('overview');

  const stats = {
    totalObjectives: objectives.length,
    completedObjectives: objectives.filter(o => 
      o.tasks.length > 0 && o.tasks.every(t => t.status === 'completed')
    ).length,
    totalTasks: objectives.reduce((sum, o) => sum + o.tasks.length, 0),
    completedTasks: objectives.reduce((sum, o) => 
      sum + o.tasks.filter(t => t.status === 'completed').length, 0
    ),
    executingTasks: objectives.reduce((sum, o) => 
      sum + o.tasks.filter(t => t.status === 'executing').length, 0
    ),
    avgTasksPerObjective: objectives.length > 0 
      ? (objectives.reduce((sum, o) => sum + o.tasks.length, 0) / objectives.length).toFixed(1)
      : '0',
  };

  const completionRate = stats.totalTasks > 0 
    ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
    : '0';

  const recentActivity = objectives
    .flatMap(o => o.tasks.filter(t => t.completedAt))
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);
  
  // Task category distribution
  const allTasks = objectives.flatMap(obj => obj.tasks);
  const categoryStats = allTasks.reduce((acc, task) => {
    const cat = task.category || 'uncategorized';
    if (!acc[cat]) {
      acc[cat] = { total: 0, completed: 0 };
    }
    acc[cat].total++;
    if (task.status === 'completed') acc[cat].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);
  
  // Calculate average completion time
  const tasksWithTime = allTasks.filter(t => t.completedAt && t.createdAt);
  const avgCompletionTime = tasksWithTime.length > 0
    ? tasksWithTime.reduce((acc, t) => acc + (t.completedAt! - t.createdAt), 0) / tasksWithTime.length
    : 0;
  const avgMinutes = Math.round(avgCompletionTime / 60000);

  // Burndown Chart Data - Show remaining tasks over time
  const burndownData = useMemo(() => {
    const completedTasksWithTime = allTasks
      .filter(t => t.completedAt)
      .sort((a, b) => a.completedAt! - b.completedAt!);
    
    if (completedTasksWithTime.length === 0) return [];

    const startTime = Math.min(...allTasks.map(t => t.createdAt));
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const days: { date: string; remaining: number; completed: number; ideal: number }[] = [];
    let currentTime = startTime;
    const totalTasks = allTasks.length;
    
    while (currentTime <= now) {
      const date = new Date(currentTime);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      
      const completedByThisDay = completedTasksWithTime.filter(
        t => t.completedAt! <= currentTime
      ).length;
      
      const remaining = totalTasks - completedByThisDay;
      const daysSinceStart = (currentTime - startTime) / dayMs;
      const idealRemaining = Math.max(0, totalTasks - (totalTasks / 7) * daysSinceStart);
      
      days.push({
        date: dateStr,
        remaining,
        completed: completedByThisDay,
        ideal: Math.round(idealRemaining)
      });
      
      currentTime += dayMs;
    }
    
    return days.slice(-7); // Last 7 days
  }, [allTasks]);

  // Velocity Chart Data - Tasks completed per day
  const velocityData = useMemo(() => {
    const completedTasks = allTasks.filter(t => t.completedAt);
    
    if (completedTasks.length === 0) return [];

    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const sevenDaysAgo = now - (7 * dayMs);
    
    const days: { date: string; completed: number; avgVelocity: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * dayMs);
      const dayEnd = dayStart + dayMs;
      const date = new Date(dayStart);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      
      const completedThisDay = completedTasks.filter(
        t => t.completedAt! >= dayStart && t.completedAt! < dayEnd
      ).length;
      
      const avgVelocity = completedTasks.length / 7;
      
      days.push({
        date: dateStr,
        completed: completedThisDay,
        avgVelocity: Math.round(avgVelocity * 10) / 10
      });
    }
    
    return days;
  }, [allTasks]);

  // Category Pie Chart Data
  const categoryPieData = useMemo(() => {
    return Object.entries(categoryStats)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: data.total
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [categoryStats]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-white mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
        </div>
        
        {/* View Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'burndown', label: 'Burndown', icon: TrendingUp },
            { id: 'velocity', label: 'Velocity', icon: Activity },
            { id: 'categories', label: 'Categories', icon: PieChart }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeView === id
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Objectives</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalObjectives}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.completedObjectives} completed
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">Tasks Done</span>
          </div>
          <div className="text-2xl font-bold">{stats.completedTasks}</div>
          <div className="text-xs text-muted-foreground mt-1">
            of {stats.totalTasks} total
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Completion</span>
          </div>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            overall rate
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-xl p-4 border border-yellow-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Avg Time</span>
          </div>
          <div className="text-2xl font-bold">{avgMinutes > 0 ? `${avgMinutes}m` : '-'}</div>
          <div className="text-xs text-muted-foreground mt-1">
            per task
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
      >
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Category Breakdown */}
            {Object.keys(categoryStats).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Task Categories
                </h3>
                <div className="space-y-2">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 5)
                    .map(([category, stats]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize">{category}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                            style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Recent Completions
                </h3>
                <div className="space-y-2">
                  {recentActivity.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/80 truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.completedAt && new Date(task.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            {stats.totalTasks > 0 && (
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Performance Insights
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• You're averaging {stats.avgTasksPerObjective} tasks per objective</p>
                  <p>• {stats.executingTasks > 0 ? `${stats.executingTasks} task${stats.executingTasks > 1 ? 's' : ''} currently in progress` : 'No tasks currently executing'}</p>
                  <p>• Overall completion rate: {completionRate}%</p>
                  {avgMinutes > 0 && <p>• Tasks complete in ~{avgMinutes} minutes on average</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'burndown' && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Burndown Chart - Last 7 Days
            </h3>
            {burndownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="remaining" 
                    stroke="#ec4899" 
                    fill="url(#colorRemaining)" 
                    name="Remaining Tasks"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ideal" 
                    stroke="#8b5cf6" 
                    fill="transparent"
                    strokeDasharray="5 5"
                    name="Ideal Burndown"
                  />
                  <defs>
                    <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No completed tasks yet to display burndown chart</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'velocity' && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Velocity Chart - Tasks Per Day
            </h3>
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar 
                    dataKey="completed" 
                    fill="#10b981" 
                    name="Tasks Completed"
                    radius={[8, 8, 0, 0]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgVelocity" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Average Velocity"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No completed tasks yet to display velocity chart</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'categories' && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Task Distribution by Category
            </h3>
            {categoryPieData.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                  {categoryPieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No tasks yet to display category distribution</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Analytics;
