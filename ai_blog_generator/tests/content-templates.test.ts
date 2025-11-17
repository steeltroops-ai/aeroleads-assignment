/**
 * Content Templates Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
    detectArticleType,
    getTemplate,
    buildPromptFromTemplate,
    suggestTemplates,
    getAllTemplates,
} from '../src/lib/content-templates';

describe('Content Templates', () => {
    it('should detect tutorial type', () => {
        const type = detectArticleType('How to Build a REST API');
        expect(type).toBe('how-to');
    });

    it('should detect listicle type', () => {
        const type = detectArticleType('10 Best JavaScript Frameworks');
        expect(type).toBe('listicle');
    });

    it('should detect comparison type', () => {
        const type = detectArticleType('React vs Vue: Which is Better?');
        expect(type).toBe('comparison');
    });

    it('should detect guide type', () => {
        const type = detectArticleType('Complete Guide to TypeScript');
        expect(type).toBe('guide');
    });

    it('should get template by type', () => {
        const template = getTemplate('tutorial');

        expect(template).toBeDefined();
        expect(template.type).toBe('tutorial');
        expect(template.name).toBe('Tutorial');
        expect(template.structure).toBeInstanceOf(Array);
        expect(template.promptTemplate).toContain('{title}');
    });

    it('should build prompt from template', () => {
        const template = getTemplate('tutorial');
        const prompt = buildPromptFromTemplate(
            'Getting Started with TypeScript',
            template,
            'technical',
            'medium'
        );

        expect(prompt).toContain('Getting Started with TypeScript');
        expect(prompt).toContain('technical');
        expect(prompt).toContain('medium');
    });

    it('should suggest templates', () => {
        const suggestions = suggestTemplates('How to Build a REST API');

        expect(suggestions).toBeInstanceOf(Array);
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].type).toBe('how-to');
    });

    it('should get all templates', () => {
        const templates = getAllTemplates();

        expect(templates).toBeInstanceOf(Array);
        expect(templates.length).toBe(9);

        const types = templates.map(t => t.type);
        expect(types).toContain('tutorial');
        expect(types).toContain('how-to');
        expect(types).toContain('listicle');
        expect(types).toContain('comparison');
    });

    it('should have valid template structure', () => {
        const templates = getAllTemplates();

        templates.forEach(template => {
            expect(template.type).toBeDefined();
            expect(template.name).toBeDefined();
            expect(template.description).toBeDefined();
            expect(template.structure).toBeInstanceOf(Array);
            expect(template.structure.length).toBeGreaterThan(0);
            expect(template.promptTemplate).toBeDefined();
            expect(template.recommendedLength).toBeDefined();
            expect(template.recommendedTone).toBeDefined();
        });
    });
});
