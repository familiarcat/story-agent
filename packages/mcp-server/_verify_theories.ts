import { THEORIZED_TOOLS } from './src/lib/skill-theories.js';
import { listSkillTheories, getSkillTheory, skillCoverage, mcpAnnotationsFor, validateSkillTheory, defineSkillTheory } from '@story-agent/shared/skill-theory';

const all = listSkillTheories();
console.log(`registered theories: ${all.length}`);
console.log('all valid:', all.every(t => validateSkillTheory(t).ok));

const sh = getSkillTheory('run_shell')!;
console.log('\nrun_shell 5W1H:');
console.log('  WHO  :', sh.who.owner, '(min tier', sh.who.minTier + ')');
console.log('  WHAT :', sh.what.summary);
console.log('  WHEN :', sh.when.useWhen[0], '| AVOID:', sh.when.avoidWhen?.[0]);
console.log('  WHERE:', sh.where.scope.join('+'), '| sideEffects=' + sh.where.sideEffects);
console.log('  WHY  :', sh.why.rationale);
console.log('  HOW  :', sh.how.invocation, '| annotations=' + JSON.stringify(sh.how.annotations));

console.log('\nMCP annotations write_file:', JSON.stringify(mcpAnnotationsFor('write_file')));

const registered = [...THEORIZED_TOOLS, 'list_projects', 'launch_crew_mission', 'get_story'];
const cov = skillCoverage(registered);
console.log('\ncoverage:', `${cov.described}/${cov.total} (${cov.coverage})`, '| missing:', cov.missing.join(', '));

try { defineSkillTheory({ tool: 'bad' } as any); console.log('VALIDATION FAILED TO REJECT (bug)'); }
catch (e: any) { console.log('\nvalidation rejects incomplete:', e.message); }
process.exit(0);
