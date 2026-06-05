import { describe, it, expect } from 'vitest';
import { substitutePromptVariables } from '../lib/prompt-engine.js';

describe('substitutePromptVariables', () => {
  describe('basic variable substitution', () => {
    it('replaces a single {{variable}} placeholder', () => {
      const result = substitutePromptVariables('Hello {{name}}!', { name: 'Picard' });
      expect(result).toBe('Hello Picard!');
    });

    it('replaces multiple occurrences of the same variable', () => {
      const result = substitutePromptVariables('{{x}} + {{x}} = two {{x}}', { x: 'apples' });
      expect(result).toBe('apples + apples = two apples');
    });

    it('replaces multiple different variables', () => {
      const result = substitutePromptVariables(
        'Story {{storyNum}}: {{storyName}}',
        { storyNum: 'LADV-123', storyName: 'Build feature X' }
      );
      expect(result).toBe('Story LADV-123: Build feature X');
    });

    it('replaces a missing/undefined variable with an empty string', () => {
      const result = substitutePromptVariables('Hello {{name}}!', { name: undefined });
      expect(result).toBe('Hello !');
    });

    it('replaces a false-y value (0) with string "0"', () => {
      const result = substitutePromptVariables('Count: {{count}}', { count: 0 });
      expect(result).toBe('Count: 0');
    });

    it('leaves unknown placeholders unreplaced', () => {
      const result = substitutePromptVariables('Hello {{unknown}}!', {});
      expect(result).toBe('Hello {{unknown}}!');
    });

    it('returns the template unchanged if variables object is empty', () => {
      const template = 'No variables here.';
      expect(substitutePromptVariables(template, {})).toBe(template);
    });
  });

  describe('conditional block substitution {{#var}}...{{/var}}', () => {
    it('includes block content when variable is truthy', () => {
      const result = substitutePromptVariables(
        'Base.{{#techStack}} Tech: {{techStack}}.{{/techStack}}',
        { techStack: 'TypeScript' }
      );
      expect(result).toBe('Base. Tech: TypeScript.');
    });

    it('removes block entirely when variable is falsy', () => {
      const result = substitutePromptVariables(
        'Base.{{#techStack}} Tech: {{techStack}}.{{/techStack}}',
        { techStack: undefined }
      );
      expect(result).toBe('Base.');
    });

    it('removes block when variable is empty string', () => {
      const result = substitutePromptVariables(
        'Prefix.{{#extra}} Extra: {{extra}}{{/extra}} Suffix.',
        { extra: '' }
      );
      expect(result).toBe('Prefix. Suffix.');
    });

    it('handles multiple independent conditional blocks', () => {
      const template =
        '{{#a}}A is set. {{/a}}{{#b}}B is set.{{/b}}';
      const result = substitutePromptVariables(template, { a: 'yes', b: undefined });
      expect(result).toBe('A is set. ');
    });

    it('substitutes variables inside an included conditional block', () => {
      const result = substitutePromptVariables(
        '{{#reviewers}}Notify: {{reviewers}}{{/reviewers}}',
        { reviewers: 'alice, bob' }
      );
      expect(result).toBe('Notify: alice, bob');
    });

    it('handles multiline block content', () => {
      const template =
        'Header.\n{{#details}}\nLine 1: {{details}}\nLine 2.\n{{/details}}\nFooter.';
      const result = substitutePromptVariables(template, { details: 'info' });
      expect(result).toBe('Header.\n\nLine 1: info\nLine 2.\n\nFooter.');
    });
  });

  describe('edge cases', () => {
    it('handles boolean true variable', () => {
      const result = substitutePromptVariables('{{#flag}}present{{/flag}}', { flag: true });
      expect(result).toBe('present');
    });

    it('handles boolean false variable (removes block)', () => {
      const result = substitutePromptVariables('{{#flag}}present{{/flag}}', { flag: false });
      expect(result).toBe('');
    });

    it('handles numeric variable in placeholder', () => {
      const result = substitutePromptVariables('Weight: {{weight}}', { weight: 1.5 });
      expect(result).toBe('Weight: 1.5');
    });

    it('does not corrupt unrelated template text', () => {
      const template = 'FINDINGS:\n- Finding 1\nRECOMMENDATIONS:\n- Rec 1';
      expect(substitutePromptVariables(template, {})).toBe(template);
    });
  });
});
