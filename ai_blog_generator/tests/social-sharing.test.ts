/**
 * Social Sharing Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
    generateSharingLink,
    generateAllSharingLinks,
    generateOpenGraphTags,
    generateTwitterCardTags,
    generateShareableQuote,
    generateHashtags,
} from '../src/lib/social-sharing';
import { BlogPost } from '../src/lib/storage';

describe('Social Sharing', () => {
    const samplePost: BlogPost = {
        slug: 'test-post',
        title: 'Getting Started with TypeScript',
        content: 'TypeScript is a typed superset of JavaScript.',
        tags: ['typescript', 'javascript', 'programming'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        published: true,
        description: 'Learn TypeScript basics',
        author: 'Test Author',
    };

    const baseUrl = 'https://example.com';

    it('should generate Twitter sharing link', () => {
        const link = generateSharingLink('twitter', {
            title: samplePost.title,
            description: samplePost.description!,
            url: `${baseUrl}/blog/${samplePost.slug}`,
            hashtags: samplePost.tags,
        });

        expect(link.platform).toBe('twitter');
        expect(link.url).toContain('twitter.com');
        expect(link.url).toContain('Getting');
        expect(link.url).toContain('TypeScript');
        expect(link.label).toBe('Share on Twitter');
    });

    it('should generate all sharing links', () => {
        const links = generateAllSharingLinks(samplePost, baseUrl);

        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(6); // twitter, facebook, linkedin, reddit, hackernews, email

        const platforms = links.map(l => l.platform);
        expect(platforms).toContain('twitter');
        expect(platforms).toContain('facebook');
        expect(platforms).toContain('linkedin');
        expect(platforms).toContain('reddit');
        expect(platforms).toContain('hackernews');
        expect(platforms).toContain('email');
    });

    it('should generate Open Graph tags', () => {
        const tags = generateOpenGraphTags(samplePost, baseUrl);

        expect(tags['og:type']).toBe('article');
        expect(tags['og:title']).toBe(samplePost.title);
        expect(tags['og:description']).toBe(samplePost.description);
        expect(tags['og:url']).toBe(`${baseUrl}/blog/${samplePost.slug}`);
        expect(tags['article:author']).toBe(samplePost.author);
    });

    it('should generate Twitter Card tags', () => {
        const tags = generateTwitterCardTags(samplePost, baseUrl);

        expect(tags['twitter:card']).toBe('summary_large_image');
        expect(tags['twitter:title']).toBe(samplePost.title);
        expect(tags['twitter:description']).toBe(samplePost.description);
        expect(tags['twitter:url']).toBe(`${baseUrl}/blog/${samplePost.slug}`);
    });

    it('should generate shareable quote', () => {
        const content = 'This is a great article about TypeScript. It covers all the basics. TypeScript is amazing!';
        const quote = generateShareableQuote(content, 100);

        expect(quote).toBeDefined();
        expect(quote.length).toBeLessThanOrEqual(100);
    });

    it('should generate hashtags', () => {
        const hashtags = generateHashtags(['Type Script', 'Java-Script', 'Programming!'], 3);

        expect(hashtags).toBeInstanceOf(Array);
        expect(hashtags.length).toBeLessThanOrEqual(3);
        expect(hashtags[0]).toBe('TypeScript');
        expect(hashtags[1]).toBe('JavaScript');
        expect(hashtags[2]).toBe('Programming');
    });

    it('should handle email sharing', () => {
        const link = generateSharingLink('email', {
            title: samplePost.title,
            description: samplePost.description!,
            url: `${baseUrl}/blog/${samplePost.slug}`,
        });

        expect(link.platform).toBe('email');
        expect(link.url).toContain('mailto:');
        expect(link.url).toContain('subject=');
        expect(link.url).toContain('body=');
    });
});
