import { Objective, Task } from '@/components/BabyAGI';
import { jsPDF } from 'jspdf';

// Export to Markdown format
export const exportToMarkdown = (objectives: Objective[]): string => {
  let markdown = '# BabyAGI - Objectives Export\n\n';
  markdown += `*Exported on: ${new Date().toLocaleString()}*\n\n`;
  markdown += `---\n\n`;

  objectives.forEach((obj, index) => {
    markdown += `## ${index + 1}. ${obj.title}\n\n`;
    
    if (obj.description) {
      markdown += `**Description:** ${obj.description}\n\n`;
    }
    
    markdown += `**Status:** ${obj.status}  \n`;
    markdown += `**Agent Role:** ${obj.agentRole || 'general'}  \n`;
    markdown += `**Created:** ${new Date(obj.createdAt).toLocaleDateString()}  \n`;
    markdown += `**Tasks:** ${obj.tasks.filter(t => t.status === 'completed').length}/${obj.tasks.length} completed\n\n`;
    
    if (obj.aiInsights) {
      markdown += `**AI Insights:** ${obj.aiInsights}\n\n`;
    }
    
    if (obj.tasks.length > 0) {
      markdown += `### Tasks\n\n`;
      
      const renderTasks = (tasks: Task[], depth: number = 0) => {
        tasks.forEach((task, taskIndex) => {
          const indent = '  '.repeat(depth);
          const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
          const strikethrough = task.status === 'completed' ? '~~' : '';
          
          markdown += `${indent}- ${checkbox} ${strikethrough}${task.title}${strikethrough}`;
          
          if (task.category || task.estimatedTime || task.priority) {
            const meta = [];
            if (task.category) meta.push(`*${task.category}*`);
            if (task.estimatedTime) meta.push(`⏱️ ${task.estimatedTime}`);
            if (task.priority) meta.push(`P${task.priority}`);
            markdown += ` (${meta.join(', ')})`;
          }
          
          markdown += '\n';
          
          // Render subtasks recursively
          if (task.subtasks && task.subtasks.length > 0) {
            renderTasks(task.subtasks, depth + 1);
          }
        });
      };
      
      renderTasks(obj.tasks);
      markdown += '\n';
    }
    
    markdown += `---\n\n`;
  });
  
  return markdown;
};

// Export to Notion format (Markdown-compatible with Notion enhancements)
export const exportToNotion = (objectives: Objective[]): string => {
  let notion = '# 🎯 BabyAGI - Objectives\n\n';
  notion += `> Exported on ${new Date().toLocaleString()}\n\n`;

  objectives.forEach((obj) => {
    notion += `## ${obj.title}\n\n`;
    
    // Properties block
    notion += `**Status** ${getStatusEmoji(obj.status)} ${obj.status}\n\n`;
    notion += `**Agent** ${getAgentEmoji(obj.agentRole)} ${obj.agentRole || 'general'}\n\n`;
    notion += `**Progress** ${obj.tasks.filter(t => t.status === 'completed').length}/${obj.tasks.length} tasks\n\n`;
    
    if (obj.description) {
      notion += `### 📝 Description\n\n${obj.description}\n\n`;
    }
    
    if (obj.aiInsights) {
      notion += `### 💡 AI Insights\n\n> ${obj.aiInsights}\n\n`;
    }
    
    if (obj.tasks.length > 0) {
      notion += `### ✅ Tasks\n\n`;
      
      const renderTasks = (tasks: Task[], depth: number = 0) => {
        tasks.forEach((task) => {
          const indent = '  '.repeat(depth);
          const checkbox = task.status === 'completed' ? '✅' : task.status === 'executing' ? '⚡' : '⭕';
          
          notion += `${indent}- ${checkbox} ${task.title}`;
          
          if (task.category) {
            notion += ` \`${task.category}\``;
          }
          
          notion += '\n';
          
          if (task.subtasks && task.subtasks.length > 0) {
            renderTasks(task.subtasks, depth + 1);
          }
        });
      };
      
      renderTasks(obj.tasks);
      notion += '\n';
    }
    
    notion += `---\n\n`;
  });
  
  return notion;
};

// Export to CSV format (for Google Sheets)
export const exportToCSV = (objectives: Objective[]): string => {
  let csv = 'Objective,Description,Status,Agent Role,Task,Task Status,Priority,Category,Estimated Time,Created Date\n';
  
  objectives.forEach((obj) => {
    const objCreated = new Date(obj.createdAt).toLocaleDateString();
    
    if (obj.tasks.length === 0) {
      csv += `"${escapeCSV(obj.title)}","${escapeCSV(obj.description || '')}","${obj.status}","${obj.agentRole || 'general'}","","","","","","${objCreated}"\n`;
    } else {
      const flattenTasks = (tasks: Task[], parentTitle: string = ''): void => {
        tasks.forEach((task) => {
          const taskTitle = parentTitle ? `${parentTitle} > ${task.title}` : task.title;
          csv += `"${escapeCSV(obj.title)}","${escapeCSV(obj.description || '')}","${obj.status}","${obj.agentRole || 'general'}","${escapeCSV(taskTitle)}","${task.status}","${task.priority}","${task.category || ''}","${task.estimatedTime || ''}","${objCreated}"\n`;
          
          if (task.subtasks && task.subtasks.length > 0) {
            flattenTasks(task.subtasks, taskTitle);
          }
        });
      };
      
      flattenTasks(obj.tasks);
    }
  });
  
  return csv;
};

// Export to PDF format
export const exportToPDF = (objectives: Objective[]): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  
  // Helper to add new page if needed
  const checkNewPage = (requiredSpace: number = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BabyAGI - Objectives Export', margin, yPosition);
  yPosition += 10;
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 15;
  doc.setTextColor(0);
  
  // Objectives
  objectives.forEach((obj, objIndex) => {
    checkNewPage(30);
    
    // Objective title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(`${objIndex + 1}. ${obj.title}`, maxWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 7;
    
    // Objective metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    
    const completedTasks = obj.tasks.filter(t => t.status === 'completed').length;
    const metadata = [
      `Status: ${obj.status}`,
      `Agent: ${obj.agentRole || 'general'}`,
      `Tasks: ${completedTasks}/${obj.tasks.length}`,
      `Created: ${new Date(obj.createdAt).toLocaleDateString()}`
    ].join(' | ');
    
    doc.text(metadata, margin, yPosition);
    yPosition += 8;
    doc.setTextColor(0);
    
    // Description
    if (obj.description) {
      checkNewPage(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const descLines = doc.splitTextToSize(obj.description, maxWidth);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * 5 + 5;
      doc.setFont('helvetica', 'normal');
    }
    
    // AI Insights
    if (obj.aiInsights) {
      checkNewPage(20);
      doc.setFontSize(9);
      doc.setTextColor(0, 100, 200);
      doc.text('💡 AI Insights:', margin, yPosition);
      yPosition += 5;
      doc.setTextColor(0);
      const insightLines = doc.splitTextToSize(obj.aiInsights, maxWidth - 5);
      doc.text(insightLines, margin + 5, yPosition);
      yPosition += insightLines.length * 4 + 5;
    }
    
    // Tasks
    if (obj.tasks.length > 0) {
      checkNewPage(15);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Tasks:', margin, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      
      const renderTasks = (tasks: Task[], indent: number = 0) => {
        tasks.forEach((task) => {
          checkNewPage(8);
          
          doc.setFontSize(9);
          const checkbox = task.status === 'completed' ? '☑' : '☐';
          const indentSpace = '  '.repeat(indent);
          const taskText = `${indentSpace}${checkbox} ${task.title}`;
          
          // Strike-through for completed tasks
          if (task.status === 'completed') {
            doc.setTextColor(150);
          } else {
            doc.setTextColor(0);
          }
          
          const taskLines = doc.splitTextToSize(taskText, maxWidth - (indent * 3));
          doc.text(taskLines, margin + indent * 3, yPosition);
          yPosition += taskLines.length * 4.5;
          
          // Task metadata
          if (task.category || task.estimatedTime) {
            doc.setFontSize(8);
            doc.setTextColor(120);
            const taskMeta = [];
            if (task.category) taskMeta.push(task.category);
            if (task.estimatedTime) taskMeta.push(task.estimatedTime);
            if (task.priority) taskMeta.push(`P${task.priority}`);
            doc.text(`(${taskMeta.join(', ')})`, margin + indent * 3 + 5, yPosition);
            yPosition += 4;
          }
          
          doc.setTextColor(0);
          
          // Render subtasks
          if (task.subtasks && task.subtasks.length > 0) {
            renderTasks(task.subtasks, indent + 1);
          }
        });
      };
      
      renderTasks(obj.tasks);
      yPosition += 5;
    }
    
    // Separator line
    if (objIndex < objectives.length - 1) {
      checkNewPage(10);
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
  });
  
  // Save PDF
  doc.save(`babyagi-export-${Date.now()}.pdf`);
};

// Helper functions
const escapeCSV = (str: string): string => {
  if (!str) return '';
  return str.replace(/"/g, '""');
};

const getStatusEmoji = (status: string): string => {
  switch (status) {
    case 'active': return '🟢';
    case 'paused': return '🟡';
    case 'completed': return '✅';
    default: return '⚪';
  }
};

const getAgentEmoji = (role?: string): string => {
  switch (role) {
    case 'developer': return '👨‍💻';
    case 'designer': return '🎨';
    case 'researcher': return '🔍';
    case 'manager': return '📊';
    case 'analyst': return '📈';
    default: return '🤖';
  }
};

// Download helper
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
