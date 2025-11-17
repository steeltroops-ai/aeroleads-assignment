/**
 * Robots.txt Generation
 * 
 * Generates robots.txt for SEO optimization
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/manage/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
