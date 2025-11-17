/**
 * Sitemap Generation
 * 
 * Generates a sitemap.xml for SEO optimization
 */

import { MetadataRoute } from 'next';
import { createStorageClientFromEnv } from '@/lib/storage';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';
    const storageClient = createStorageClientFromEnv();

    // Get all published posts
    const posts = await storageClient.listPosts({
        published: true,
    });

    // Generate sitemap entries for blog posts
    const blogPosts: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];

    return [...staticPages, ...blogPosts];
}
