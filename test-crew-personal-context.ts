/**
 * Test script for crew personal context system
 * Validates that all query types work and return non-empty responses
 */

import { getPersonalContext, getPersonalContextBatch, getRelationshipMatrix, getCrewQuotes, getDecisionPatterns } from './packages/mcp-server/src/lib/crew-personal-context.js';
import { getCrewProfile, getAllCrewProfiles } from './packages/mcp-server/src/lib/crew-canonical-profiles.js';
import { getEnhancedSystemPrompt } from './packages/mcp-server/src/lib/crew-enhanced-prompts.js';
import { getEnhancedSystemPromptContent, getContextualizedEnhancedPrompt } from './packages/mcp-server/src/lib/prompt-templates.js';

async function runTests() {
  console.log('🚀 Starting Crew Personal Context Tests\n');
  let passed = 0;
  let failed = 0;

  // Test 1: getCrewProfile for each crew member
  console.log('📋 Test 1: Get profiles for all 11 crew members');
  const crewIds = ['picard', 'riker', 'worf', 'data', 'geordi', 'deanna', 'beverly', 'tasha', 'obrien', 'quark', 'uhura'] as const;
  
  for (const crewId of crewIds) {
    const profile = getCrewProfile(crewId);
    if (profile && profile.name && profile.expertise) {
      console.log(`  ✅ ${crewId}: ${profile.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${crewId}: Failed to load profile`);
      failed++;
    }
  }
  console.log();

  // Test 2: Personal context queries
  console.log('📝 Test 2: Personal context queries');
  const queries = [
    { asCrewMember: 'picard' as const, question: 'Tell me about Beverly' },
    { asCrewMember: 'data' as const, question: 'How do you feel about becoming human?' },
    { asCrewMember: 'worf' as const, question: 'What is your greatest trauma?' },
    { asCrewMember: 'tasha' as const, question: 'Tell me about Data' },
  ];

  for (const query of queries) {
    try {
      const response = getPersonalContext(query);
      if (response && response.context && response.context.length > 0) {
        console.log(`  ✅ ${query.asCrewMember}: "${query.question.substring(0, 30)}..."`);
        passed++;
      } else {
        console.log(`  ❌ ${query.asCrewMember}: Empty response`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ ${query.asCrewMember}: ${(e as Error).message}`);
      failed++;
    }
  }
  console.log();

  // Test 3: Batch queries
  console.log('🔄 Test 3: Batch queries');
  try {
    const responses = getPersonalContextBatch(queries);
    if (responses && responses.length === queries.length) {
      console.log(`  ✅ Batch query returned ${responses.length} responses`);
      passed++;
    } else {
      console.log(`  ❌ Batch query returned wrong count`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Batch query failed: ${(e as Error).message}`);
    failed++;
  }
  console.log();

  // Test 4: Relationship matrix
  console.log('🔗 Test 4: Relationship matrix');
  try {
    const matrix = getRelationshipMatrix();
    if (matrix && Object.keys(matrix).length === 11) {
      console.log(`  ✅ Relationship matrix has ${Object.keys(matrix).length} crew members`);
      passed++;
    } else {
      console.log(`  ❌ Relationship matrix incomplete`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Relationship matrix failed: ${(e as Error).message}`);
    failed++;
  }
  console.log();

  // Test 5: Crew quotes
  console.log('💬 Test 5: Canonical quotes');
  let quotesCount = 0;
  for (const crewId of crewIds) {
    const quotes = getCrewQuotes(crewId);
    if (quotes && quotes.length > 0) {
      quotesCount += quotes.length;
    }
  }
  if (quotesCount > 0) {
    console.log(`  ✅ Total ${quotesCount} authentic quotes retrieved`);
    passed++;
  } else {
    console.log(`  ❌ No quotes found`);
    failed++;
  }
  console.log();

  // Test 6: Decision patterns
  console.log('🎯 Test 6: Decision patterns');
  let patternsCount = 0;
  for (const crewId of crewIds) {
    const patterns = getDecisionPatterns(crewId);
    if (patterns && patterns.length > 0) {
      patternsCount++;
    }
  }
  if (patternsCount >= 10) {
    console.log(`  ✅ Decision patterns for ${patternsCount} crew members`);
    passed++;
  } else {
    console.log(`  ❌ Only ${patternsCount} decision patterns found`);
    failed++;
  }
  console.log();

  // Test 7: Enhanced system prompts
  console.log('🎭 Test 7: Enhanced system prompts');
  let prompts = 0;
  for (const crewId of crewIds) {
    const prompt = getEnhancedSystemPrompt(crewId);
    if (prompt && prompt.length > 500) {
      prompts++;
    }
  }
  if (prompts === 11) {
    console.log(`  ✅ All 11 enhanced prompts available (${prompts}/11)`);
    passed++;
  } else {
    console.log(`  ❌ Only ${prompts}/11 enhanced prompts found`);
    failed++;
  }
  console.log();

  // Test 8: Integration with prompt-templates (NEW)
  console.log('🔗 Test 8: Integrated enhanced prompts via prompt-templates');
  const registryIds = ['picard', 'data', 'riker', 'geordi', 'obrien', 'worf', 'yar', 'troi', 'crusher', 'uhura', 'quark'];
  let integrationCount = 0;
  for (const registryId of registryIds) {
    const enhancedPrompt = getEnhancedSystemPromptContent(registryId);
    if (enhancedPrompt && enhancedPrompt.length > 500 && !enhancedPrompt.includes('No enhanced prompt available')) {
      integrationCount++;
    }
  }
  if (integrationCount >= 10) {
    console.log(`  ✅ ${integrationCount} crew members have integrated enhanced prompts`);
    passed++;
  } else {
    console.log(`  ❌ Only ${integrationCount} integrated prompts found`);
    failed++;
  }
  console.log();

  // Test 9: Contextualized prompts (NEW)
  console.log('📌 Test 9: Contextualized enhanced prompts');
  try {
    const contextualPrompt = getContextualizedEnhancedPrompt('picard', {
      towardsCrew: 'beverly',
      situation: 'discussing a sensitive command decision'
    });
    if (contextualPrompt && contextualPrompt.length > 500) {
      console.log(`  ✅ Contextualized prompt generated (${contextualPrompt.length} chars)`);
      passed++;
    } else {
      console.log(`  ❌ Contextualized prompt too short`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ Contextualized prompt failed: ${(e as Error).message}`);
    failed++;
  }
  console.log();

  // Summary
  console.log('═'.repeat(50));
  console.log(`✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
  if (failed === 0) {
    console.log('🎉 All tests PASSED! Integration successful.');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review before proceeding.`);
  }
  console.log('═'.repeat(50));

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
