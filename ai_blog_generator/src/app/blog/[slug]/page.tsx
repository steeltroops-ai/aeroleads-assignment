/**
 * Individual Blog Post Page
 * 
 * Renders a single blog post with markdown content, table of contents,
 * and navigation to previous/next posts
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createStorageClientFromEnv } from '@/lib/storage';
import { renderMarkdown, extractTableOfContents } from '@/lib/markdown';
import TableOfContents from './TableOfContents';
import Navigation from '@/components/Navigation';
import SocialShare from '@/components/SocialShare';
import BlogAudioPlayer from '@/components/BlogAudioPlayer';
import { generateOpenGraphTags, generateTwitterCardTags } from '@/lib/social-sharing';
import { generateStructuredData } from '@/lib/seo';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

interface BlogPostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

// Generate static params for all published posts
export async function generateStaticParams() {
    const storageClient = createStorageClientFromEnv();
    const posts = await storageClient.listPosts({ published: true });

    return posts.map((post) => ({
        slug: post.slug,
    }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const storageClient = createStorageClientFromEnv();

    try {
        const post = await storageClient.readPost(slug);
        const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';

        // Generate Open Graph and Twitter Card metadata
        const ogTags = generateOpenGraphTags(post, baseUrl);
        const twitterTags = generateTwitterCardTags(post, baseUrl);

        return {
            title: post.title,
            description: post.description || `Read about ${post.title}`,
            authors: post.author ? [{ name: post.author }] : undefined,
            keywords: post.tags?.join(', '),
            openGraph: {
                title: ogTags['og:title'],
                description: ogTags['og:description'],
                url: ogTags['og:url'],
                siteName: ogTags['og:site_name'],
                type: 'article',
                publishedTime: post.createdAt.toISOString(),
                modifiedTime: post.updatedAt.toISOString(),
                authors: post.author ? [post.author] : undefined,
                tags: post.tags,
            },
            twitter: {
                card: twitterTags['twitter:card'] as 'summary_large_image',
                title: twitterTags['twitter:title'],
                description: twitterTags['twitter:description'],
                creator: twitterTags['twitter:creator'],
            },
        };
    } catch (error) {
        return {
            title: 'Post Not Found',
        };
    }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const storageClient = createStorageClientFromEnv();

    // Get the current post
    let post;
    try {
        post = await storageClient.readPost(slug);
    } catch (error) {
        notFound();
    }

    // Check if post is published
    if (!post.published) {
        notFound();
    }

    // Render markdown content
    const htmlContent = await renderMarkdown(post.content);

    // Extract table of contents
    const toc = extractTableOfContents(post.content);

    // Get base URL for social sharing
    const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';

    // Generate structured data for SEO
    const structuredData = generateStructuredData(post, baseUrl);

    // Get all posts for prev/next navigation
    const allPosts = await storageClient.listPosts({
        published: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    // Find current post index
    const currentIndex = allPosts.findIndex(p => p.slug === slug);
    const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            <Navigation />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumbs */}
                <nav className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
                    <Link href="/" className="hover:text-black dark:hover:text-zinc-50">
                        Home
                    </Link>
                    <span className="mx-2">/</span>
                    <Link href="/blog" className="hover:text-black dark:hover:text-zinc-50">
                        Blog
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-black dark:text-zinc-50">{post.title}</span>
                </nav>

                <div className="flex flex-col lg:flex-row gap-8 justify-center">
                    {/* Main Content */}
                    <article className="flex-1 max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 lg:p-12">
                        {/* Article Header */}
                        <header className="mb-8 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
                                {post.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                                {post.author && (
                                    <span className="flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        {post.author}
                                    </span>
                                )}

                                <time dateTime={post.createdAt.toISOString()} className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>

                            </div>

                            {/* Tags as prominent labels */}
                            {post.tags && post.tags.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {post.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-xs font-medium shadow-sm"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                            </svg>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </header>

                        {/* Article Content */}
                        <div
                            className="prose prose-lg max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />

                        {/* Social Sharing */}
                        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                            <SocialShare post={post} baseUrl={baseUrl} />
                        </div>
                    </article>

                    {/* Floating Audio Player */}
                    <BlogAudioPlayer content={post.content} title={post.title} />

                    {/* Sidebar - Table of Contents */}
                    {toc.length > 0 && (
                        <aside className="hidden lg:block w-64 flex-shrink-0">
                            <div className="sticky top-8">
                                <TableOfContents items={toc} />
                            </div>
                        </aside>
                    )}
                </div>

                {/* Prev/Next Navigation */}
                {(prevPost || nextPost) && (
                    <nav className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {prevPost && (
                                <Link
                                    href={`/blog/${prevPost.slug}`}
                                    className="group p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                >
                                    <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">← Previous</div>
                                    <div className="font-medium text-black dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {prevPost.title}
                                    </div>
                                </Link>
                            )}

                            {nextPost && (
                                <Link
                                    href={`/blog/${nextPost.slug}`}
                                    className="group p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all md:text-right"
                                >
                                    <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">Next →</div>
                                    <div className="font-medium text-black dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {nextPost.title}
                                    </div>
                                </Link>
                            )}
                        </div>
                    </nav>
                )}

                {/* Back to Blog Link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/blog"
                        className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                        ← Back to all posts
                    </Link>
                </div>
            </div>
        </div >
    );
}
