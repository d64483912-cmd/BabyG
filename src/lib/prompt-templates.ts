export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'development' | 'research' | 'design' | 'management';
  prompt: string;
  variables: string[];
  isDefault: boolean;
}

export const defaultTemplates: PromptTemplate[] = [
  {
    id: 'default-general',
    name: 'General Task Breakdown',
    description: 'Balanced approach for any type of objective',
    category: 'general',
    prompt: `You are an AI task planner. Break down the following objective into clear, actionable tasks.

Objective: {{objective}}
Description: {{description}}

Generate 5-8 tasks that:
1. Are specific and actionable
2. Have clear completion criteria
3. Are properly sequenced
4. Include relevant categories
5. Have estimated time ranges

Return tasks in JSON format with: title, priority (1-10), category, estimatedTime.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'default-development',
    name: 'Software Development',
    description: 'Focused on coding, testing, and deployment',
    category: 'development',
    prompt: `You are a senior software development planner. Break down this development objective into technical tasks.

Objective: {{objective}}
Description: {{description}}

Generate 6-10 tasks following software development best practices:
1. Requirements analysis and planning
2. Architecture design
3. Implementation (broken into logical components)
4. Unit testing
5. Integration testing
6. Code review and optimization
7. Documentation
8. Deployment preparation

Each task should have: title, priority (1-10), category (planning/coding/testing/deployment/documentation), estimatedTime.
Focus on code quality, maintainability, and best practices.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'default-research',
    name: 'Research & Analysis',
    description: 'Comprehensive research methodology',
    category: 'research',
    prompt: `You are a research methodology expert. Break down this research objective into systematic tasks.

Objective: {{objective}}
Description: {{description}}

Generate 5-8 tasks following research best practices:
1. Define research questions and scope
2. Literature review and background research
3. Data collection methodology
4. Data analysis and synthesis
5. Findings documentation
6. Conclusions and recommendations
7. Presentation/report preparation

Each task should have: title, priority (1-10), category (research/analysis/documentation), estimatedTime.
Focus on thoroughness, accuracy, and evidence-based conclusions.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'default-design',
    name: 'UX/UI Design',
    description: 'User-centered design process',
    category: 'design',
    prompt: `You are a UX/UI design expert. Break down this design objective into user-centered tasks.

Objective: {{objective}}
Description: {{description}}

Generate 6-10 tasks following design thinking methodology:
1. User research and persona development
2. User journey mapping
3. Information architecture
4. Wireframing and low-fidelity prototypes
5. Visual design and high-fidelity mockups
6. Interaction design and micro-interactions
7. Usability testing
8. Design system documentation
9. Handoff to development

Each task should have: title, priority (1-10), category (research/wireframe/design/testing/handoff), estimatedTime.
Focus on user experience, accessibility, and design consistency.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'default-management',
    name: 'Project Management',
    description: 'Comprehensive project planning',
    category: 'management',
    prompt: `You are an experienced project manager. Break down this objective into project management tasks.

Objective: {{objective}}
Description: {{description}}

Generate 6-10 tasks following PM best practices:
1. Stakeholder identification and analysis
2. Scope definition and requirements gathering
3. Resource planning and allocation
4. Risk assessment and mitigation planning
5. Timeline and milestone definition
6. Team coordination and communication setup
7. Progress tracking and monitoring
8. Status reporting and documentation
9. Quality assurance checkpoints

Each task should have: title, priority (1-10), category (planning/coordination/monitoring/reporting), estimatedTime.
Focus on clear deliverables, dependencies, and success metrics.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'agile-sprint',
    name: 'Agile Sprint Planning',
    description: 'Sprint-based development workflow',
    category: 'development',
    prompt: `You are an Agile/Scrum expert. Break down this sprint objective into user stories and tasks.

Sprint Goal: {{objective}}
Description: {{description}}

Generate 5-8 user stories/tasks following Agile principles:
1. User stories with clear acceptance criteria
2. Definition of Done for each story
3. Story point estimates
4. Dependencies between stories
5. Testing requirements
6. Sprint retrospective items

Format: As a [user], I want [feature] so that [benefit]
Each task should have: title, priority (1-10), category (story/task/bug), estimatedTime.
Focus on delivering value incrementally and maintaining sustainable pace.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'creative-content',
    name: 'Creative Content Creation',
    description: 'Content planning and production',
    category: 'general',
    prompt: `You are a content strategist. Break down this content creation objective into production tasks.

Content Goal: {{objective}}
Description: {{description}}

Generate 5-8 tasks for content creation:
1. Content strategy and planning
2. Audience research and persona definition
3. Topic research and outline
4. Content creation/writing
5. Visual asset creation
6. Editing and proofreading
7. SEO optimization
8. Publishing and distribution
9. Performance tracking setup

Each task should have: title, priority (1-10), category (planning/creation/editing/distribution), estimatedTime.
Focus on audience engagement, quality, and brand consistency.`,
    variables: ['objective', 'description'],
    isDefault: true
  },
  {
    id: 'lean-startup',
    name: 'Lean Startup MVP',
    description: 'Minimum viable product development',
    category: 'development',
    prompt: `You are a lean startup advisor. Break down this MVP objective into lean tasks.

MVP Goal: {{objective}}
Description: {{description}}

Generate 5-7 tasks following lean startup methodology:
1. Problem validation and customer discovery
2. Core value proposition definition
3. Minimum feature set identification
4. Rapid prototype development
5. MVP launch preparation
6. Key metrics definition
7. Build-Measure-Learn cycle setup
8. Pivot/persevere decision criteria

Each task should have: title, priority (1-10), category (validation/building/measuring/learning), estimatedTime.
Focus on speed, learning, and validated learning over perfection.`,
    variables: ['objective', 'description'],
    isDefault: true
  }
];

export const getTemplateById = (id: string): PromptTemplate | undefined => {
  return defaultTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: string): PromptTemplate[] => {
  return defaultTemplates.filter(t => t.category === category);
};

export const interpolatePrompt = (template: string, variables: Record<string, string>): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
};
