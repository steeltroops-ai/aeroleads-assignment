/**
 * Content Quality Tests
 */

import { describe, it, expect } from '@jest/globals';
import { analyzeContentQuality, generateImprovementPrompt } from '../src/lib/content-quality';
import { BlogPost } from '../src/lib/storage';

describe('Content Quality Analysis', () => {
    const samplePost: BlogPost = {
        slug: 'test-post',
        title: 'Getting Started with TypeScript',
        content: `TypeScript is a typed superset of JavaScript. It adds static types to JavaScript.

## Why TypeScript?

TypeScript helps catch errors early. It provides better IDE support. It makes code more maintainable.

## Getting Started

First, install TypeScript:

\`\`\`bash
npm install -g typescript
\`\`\`

Then create a file:

\`\`\`typescript
const greeting: string = "Hello, TypeScript!";
console.log(greeting);
\`\`\`

## Conclusion

TypeScript is a powerful tool for JavaScript developers. Try it today!`,
        tags: ['typescript', 'javascript'],
        createdAt: new Date(),
        updatedAt: new Date(),
        published: true,
        description: 'Learn TypeScript basics',
        author: 'Test Author',
    };

    it('should analyze content quality', () => {
        const report = analyzeContentQuality(samplePost);

        expect(report).toBeDefined();
        expect(report.score).toBeDefined();
        expect(report.score.overall).toBeGreaterThan(0);
        expect(report.score.overall).toBeLessThanOrEqual(100);
        expect(report.issues).toBeInstanceOf(Array);
        expect(report.strengths).toBeInstanceOf(Array);
        expect(report.improvements).toBeInstanceOf(Array);
    });

    it('should have all quality dimensions', () => {
        const report = analyzeContentQuality(samplePost);

        expect(report.score.readability).toBeDefined();
        expect(report.score.structure).toBeDefined();
        expect(report.score.seo).toBeDefined();
        expect(report.score.engagement).toBeDefined();
    });

    it('should detect issues', () => {
        const shortPost: BlogPost = {
            ...samplePost,
            content: 'This is too short.',
            description: 'Short',
        };

        const report = analyzeContentQuality(shortPost);
        const errorIssues = report.issues.filter(i => i.severity === 'error');

        expect(errorIssues.length).toBeGreaterThan(0);
    });

    it('should generate improvement prompt', () => {
        const report = analyzeContentQuality(samplePost);
        const prompt = generateImprovementPrompt(samplePost, report);

        expect(prompt).toContain(samplePost.title);
        expect(prompt).toContain('improve');
    });

    it('should identify strengths', () => {
        const goodPost: BlogPost = {
            ...samplePost,
            title: 'Complete Guide to TypeScript: Everything You Need to Know',
            description: 'Learn TypeScript from basics to advanced concepts with practical examples and best practices. Perfect for JavaScript developers looking to add type safety.',
            content: `${samplePost.content}\n\n${'Lorem ipsum dolor sit amet. '.repeat(100)}`,
        };

        const report = analyzeContentQuality(goodPost);

        expect(report.strengths.length).toBeGreaterThan(0);
    });
});
