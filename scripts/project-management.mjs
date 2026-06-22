#!/usr/bin/env node

/**
 * Project Management CLI
 * 
 * Commands for managing multiple client projects in the monorepo
 * 
 * Usage:
 *   npm run project:list                      # List all projects
 *   npm run project:create <project-id>       # Create new project
 *   npm run project:select <project-id>       # Select active project
 *   npm run project:info                      # Show current project info
 *   npm run project:crew <project-id>         # Show crew assignments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DIR = path.join(__dirname, '..', 'projects');
const PROJECT_STATE_FILE = path.join(__dirname, '..', '.project-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function log(message, level = 'info') {
  const prefix = {
    info: '📁',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[level];
  console.log(`${prefix} ${message}`);
}

function getProjectState() {
  if (fs.existsSync(PROJECT_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(PROJECT_STATE_FILE, 'utf-8'));
  }
  return { activeProject: null };
}

function saveProjectState(state) {
  fs.writeFileSync(PROJECT_STATE_FILE, JSON.stringify(state, null, 2));
}

function getProjectConfig(projectId) {
  const envPath = path.join(PROJECTS_DIR, projectId, '.env');
  const examplePath = path.join(PROJECTS_DIR, projectId, '.env.example');

  if (!fs.existsSync(envPath) && !fs.existsSync(examplePath)) {
    return null;
  }

  const configPath = fs.existsSync(envPath) ? envPath : examplePath;
  const content = fs.readFileSync(configPath, 'utf-8');
  const config = {};

  content.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key.trim()) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function listProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    log('No projects directory found', 'warning');
    return;
  }

  const projects = fs.readdirSync(PROJECTS_DIR).filter(file => {
    const fullPath = path.join(PROJECTS_DIR, file);
    return fs.statSync(fullPath).isDirectory() && file !== 'template-project';
  });

  if (projects.length === 0) {
    log('No projects found', 'warning');
    return;
  }

  const state = getProjectState();
  console.log('\n📊 Available Projects:\n');

  projects.forEach(projectId => {
    const config = getProjectConfig(projectId);
    const isActive = state.activeProject === projectId ? ' [ACTIVE]' : '';
    const projectName = config?.PROJECT_NAME || projectId;
    const clientName = config?.CLIENT_NAME || 'Unknown';

    console.log(`  ${projectId}${isActive}`);
    console.log(`    Name: ${projectName}`);
    console.log(`    Client: ${clientName}`);
    console.log(`    Tier: ${config?.PROJECT_TIER || 'standard'}`);
    console.log();
  });
}

function selectProject(projectId) {
  const projectPath = path.join(PROJECTS_DIR, projectId);

  if (!fs.existsSync(projectPath)) {
    log(`Project "${projectId}" not found`, 'error');
    process.exit(1);
  }

  const config = getProjectConfig(projectId);
  if (!config) {
    log(`No configuration found for project "${projectId}"`, 'error');
    process.exit(1);
  }

  const state = getProjectState();
  state.activeProject = projectId;
  saveProjectState(state);

  log(`Selected project: ${projectId}`, 'success');
  log(`Client: ${config.CLIENT_NAME}`, 'info');
  log(`Tier: ${config.PROJECT_TIER}`, 'info');
}

function showProjectInfo() {
  const state = getProjectState();

  if (!state.activeProject) {
    log('No project selected. Use "npm run project:select <project-id>" to select one.', 'warning');
    process.exit(1);
  }

  const config = getProjectConfig(state.activeProject);

  console.log('\n📋 Active Project Information:\n');
  console.log(`  Project ID: ${state.activeProject}`);
  console.log(`  Name: ${config.PROJECT_NAME}`);
  console.log(`  Client: ${config.CLIENT_NAME}`);
  console.log(`  Tier: ${config.PROJECT_TIER}`);
  console.log(`  Created: ${config.PROJECT_CREATED}`);
  console.log(`  Database: ${config.PROJECT_DB_NAME}`);
  console.log(`  Compliance: ${config.COMPLIANCE_MODE}`);
  console.log();
  console.log(`  Primary Crew: ${config.PRIMARY_CREW}`);
  console.log(`  Secondary Crew: ${config.SECONDARY_CREW}`);
  console.log();
}

function showCrewAssignments(projectId) {
  const config = getProjectConfig(projectId);

  if (!config) {
    log(`Project "${projectId}" not found`, 'error');
    process.exit(1);
  }

  const crewMap = {
    picard: 'Captain & Strategic Command',
    data: 'Architecture & Systems',
    riker: 'Execution & Leadership',
    geordi: 'Performance & Monitoring',
    obrien: 'Operations & Infrastructure',
    worf: 'Security & Defense',
    troi: 'Communication & Stakeholders',
    crusher: 'Testing & Diagnostics',
    uhura: 'Communication & Protocols',
    quark: 'Finance & Optimization',
    yar: 'Risk Detection & Audit',
  };

  console.log(`\n👥 Crew Assignments for ${projectId}:\n`);

  const parseCrewList = (crewStr) => crewStr.split(',').map(c => c.trim());

  console.log('  🔴 Primary Crew (Full Authority):');
  parseCrewList(config.PRIMARY_CREW).forEach(crewId => {
    console.log(`    • ${crewId} — ${crewMap[crewId]}`);
  });

  console.log('\n  🟡 Secondary Crew (Supporting):');
  parseCrewList(config.SECONDARY_CREW).forEach(crewId => {
    console.log(`    • ${crewId} — ${crewMap[crewId]}`);
  });

  console.log('\n  🟢 Advisory Crew (Consultation):');
  parseCrewList(config.ADVISORY_CREW).forEach(crewId => {
    console.log(`    • ${crewId} — ${crewMap[crewId]}`);
  });

  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CLI
// ─────────────────────────────────────────────────────────────────────────────

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list':
    listProjects();
    break;

  case 'select':
    if (!arg) {
      log('Project ID required. Usage: npm run project:select <project-id>', 'error');
      process.exit(1);
    }
    selectProject(arg);
    break;

  case 'info':
    showProjectInfo();
    break;

  case 'crew':
    if (!arg) {
      const state = getProjectState();
      if (!state.activeProject) {
        log('No active project. Use "npm run project:select <project-id>" first.', 'error');
        process.exit(1);
      }
      showCrewAssignments(state.activeProject);
    } else {
      showCrewAssignments(arg);
    }
    break;

  default:
    console.log(`
Project Management CLI

Usage:
  npm run project:list                     # List all projects
  npm run project:select <project-id>      # Select active project
  npm run project:info                     # Show current project info
  npm run project:crew [project-id]        # Show crew assignments

Examples:
  npm run project:list
  npm run project:select client-pctms
  npm run project:info
  npm run project:crew client-pctms
    `);
    break;
}
