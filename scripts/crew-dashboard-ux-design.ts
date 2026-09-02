#!/usr/bin/env tsx
/**
 * COUNSELOR TROI MISSION: Dashboard UX Design
 * Priority: HIGH | Duration: 1 week
 * Objective: Create UX mockup and design specification for dashboard
 */

console.log('🟡 [COUNSELOR TROI] — Dashboard UX Design Mission');
console.log('═══════════════════════════════════════════════════');
console.log('');

const dashboardDesign = {
  mission: 'Dashboard UX Design',
  owner: 'Counselor Troi',
  priority: 'HIGH',
  estimatedDuration: '1 week',
  status: 'IN_PROGRESS',
  timestamp: new Date().toISOString(),
  
  design_brief: {
    users: 'Project operators, scrum masters, product managers',
    primary_goal: 'Quick visibility into project status, sprint progress, and story assignments',
    secondary_goals: [
      'Drag-drop story management between sprint columns',
      'Real-time collaboration (see other users editing)',
      'Responsive design (desktop primary, tablet secondary)',
    ],
  },
  
  layout_structure: {
    viewport_width: '1920px',
    sections: [
      {
        section: 'Header',
        height: '60px',
        components: [
          'Logo/Title (left)',
          'Client Selector (dropdown, sticky)',
          'User Profile + Notifications (right)',
        ],
        priority: 'CRITICAL - Must be sticky',
      },
      {
        section: 'Sidebar (Left Panel)',
        width: '280px',
        height: 'Full viewport minus header',
        components: [
          'Client Name (large, bold)',
          'Project List (scrollable)',
          '  - Project icon + name + member count',
          '  - Show sprint count next to project name',
          '  - Highlight current project',
          'Create Project button (bottom)',
        ],
        priority: 'HIGH',
      },
      {
        section: 'Main Content (Center)',
        width: 'Remaining minus right panel',
        height: 'Full viewport minus header',
        components: [
          'Sprint Selector (horizontal tabs or dropdown)',
          'Story Board (Kanban columns):',
          '  - Column 1: Open (backlog)',
          '  - Column 2: In Progress (active work)',
          '  - Column 3: Review (code review / QA)',
          '  - Column 4: Done (completed)',
          'Story Card Layout (in each column):',
          '  - Title (truncated to 2 lines)',
          '  - Story points (top-right badge)',
          '  - Assignee avatar (bottom-left)',
          '  - Blocked indicator (red icon if blocked)',
          '  - Sprint indicator if cross-sprint',
        ],
        priority: 'CRITICAL',
      },
      {
        section: 'Right Panel (Story Details)',
        width: '320px',
        height: 'Full viewport minus header',
        components: [
          'Story Title (editable)',
          'Story Description (markdown preview)',
          'Assignee Selector',
          'Story Points Selector',
          'Sprint Selector (if not in current sprint)',
          'Tasks List (collapsible)',
          '  - Show 3-5 most important tasks',
          '  - "View all" link expands',
          'Comments Section (last 3 visible)',
          'State: Open/In Progress/Review/Done buttons',
        ],
        priority: 'HIGH',
      },
    ],
  },
  
  interaction_flows: [
    {
      interaction: 'Drag story between columns',
      trigger: 'User drags story card to different column',
      steps: [
        '1. Highlight target column on hover',
        '2. Show drop indicator (green line) where it will land',
        '3. On drop: Update story state, show loading spinner',
        '4. Optimistic update: Show story in new column immediately',
        '5. API call in background (do not block UI)',
        '6. If API fails: Revert story to original column with error toast',
      ],
      priority: 'CRITICAL',
    },
    {
      interaction: 'Click story card',
      trigger: 'User clicks on story card',
      steps: [
        '1. Highlight card with border',
        '2. Load story details in right panel',
        '3. Show loading spinner in right panel while fetching',
        '4. Populate: Title, description, tasks, comments',
      ],
      priority: 'HIGH',
    },
    {
      interaction: 'Change sprint',
      trigger: 'User clicks sprint selector',
      steps: [
        '1. Show sprint dropdown (12-month view)',
        '2. Highlight current sprint',
        '3. On select: Reload kanban board for new sprint',
        '4. Animate transition (fade out stories, fade in new)',
      ],
      priority: 'HIGH',
    },
    {
      interaction: 'Assign story',
      trigger: 'User clicks assignee field in right panel',
      steps: [
        '1. Show dropdown of team members',
        '2. Show current assignee highlighted',
        '3. On select: Update immediately (optimistic)',
        '4. Show avatar on story card',
      ],
      priority: 'MEDIUM',
    },
  ],
  
  visual_design: {
    color_scheme: {
      primary: '#2563eb (blue)',
      success: '#10b981 (green)',
      warning: '#f59e0b (amber)',
      danger: '#ef4444 (red)',
      neutral: '#6b7280 (gray)',
    },
    story_card_colors: {
      open: 'Gray background (neutral)',
      in_progress: 'Blue background (active)',
      review: 'Amber background (attention)',
      done: 'Green background (complete)',
      blocked: 'Red border (urgent)',
    },
    typography: {
      title: 'SF Pro Display 18px bold',
      subtitle: 'SF Pro Display 14px medium',
      body: 'SF Pro Display 13px regular',
    },
  },
  
  responsive_breakpoints: [
    {
      name: 'Desktop (1920px)',
      layout: 'Full sidebar + center + right panel',
      priority: 'PRIMARY TARGET',
    },
    {
      name: 'Laptop (1440px)',
      layout: 'Narrow sidebar + center + collapsed right panel',
      priority: 'SECONDARY',
    },
    {
      name: 'Tablet (768px)',
      layout: 'Collapsible sidebar + full center (right panel hidden)',
      priority: 'NICE_TO_HAVE',
    },
  ],
  
  accessibility_requirements: [
    '✅ WCAG 2.1 AA compliance',
    '✅ Keyboard navigation (Tab through all interactive elements)',
    '✅ Screen reader support (aria-labels on all buttons)',
    '✅ Color contrast ratio ≥ 4.5:1 for text',
    '✅ Focus indicators visible on all interactive elements',
  ],
  
  performance_targets: [
    'Initial load: <1s (with seeded data)',
    'Drag-drop interaction: <16ms (60 FPS)',
    'Sprint switch: <500ms',
    'Story detail load: <300ms',
  ],
  
  deliverables: [
    {
      week: 1,
      deliverable: 'Figma mockups (desktop layout)',
      details: 'All sections wireframed, no visual design yet',
    },
    {
      week: 2,
      deliverable: 'Figma prototype (with interactions)',
      details: 'Drag-drop prototype, sprint switching, story detail flows',
    },
    {
      week: 2,
      deliverable: 'Design specification document',
      details: 'This file expanded with visual design, component specs, CSS grid layouts',
    },
  ],
  
  next_actions: [
    '1. Create Figma project "Story Agent Dashboard"',
    '2. Build wireframe of layout sections',
    '3. Get feedback from Brady (stakeholder walkthrough)',
    '4. Iterate on design based on feedback',
    '5. Hand off to Geordi for component scaffolding',
  ],
};

console.log('MISSION BRIEF:');
console.log(`Users: ${dashboardDesign.design_brief.users}`);
console.log(`Primary Goal: ${dashboardDesign.design_brief.primary_goal}`);
console.log('');

console.log('LAYOUT STRUCTURE:');
dashboardDesign.layout_structure.sections.forEach(section => {
  console.log(`\n  ▪ ${section.section} ${section.width ? `(${section.width})` : ''}`);
  if (Array.isArray(section.components)) {
    section.components.forEach(comp => console.log(`     • ${comp}`));
  }
  console.log(`     Priority: ${section.priority}`);
});
console.log('');

console.log('KEY INTERACTIONS:');
dashboardDesign.interaction_flows.forEach(flow => {
  console.log(`\n  ▪ ${flow.interaction} [${flow.priority}]`);
  flow.steps.forEach(step => console.log(`     ${step}`));
});
console.log('');

console.log('ACCESSIBILITY & PERFORMANCE:');
dashboardDesign.accessibility_requirements.forEach(req => {
  console.log(`  ${req}`);
});
console.log('');
dashboardDesign.performance_targets.forEach(target => {
  console.log(`  • ${target}`);
});
console.log('');

console.log('DELIVERABLES:');
dashboardDesign.deliverables.forEach(d => {
  console.log(`  Week ${d.week}: ${d.deliverable}`);
  console.log(`     ${d.details}`);
});
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ [COUNSELOR TROI] Mission complete. Starting Figma design.');
console.log('');
