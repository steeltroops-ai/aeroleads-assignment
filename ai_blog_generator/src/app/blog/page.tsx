/**
 * Blog Index Page
 * 
 * Displays a list of all published blog posts with search functionality
 */

import Link from 'next/link';
import { createStorageClientFromEnv } from '@/lib/storage';
import SearchBox from './SearchBox';
import Navigation from '@/components/Navigation';
import { HiArrowLeft, HiArrowRight, HiBookOpen } from 'react-icons/hi';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default async function BlogIndexPage() {
    const storageClient = createStorageClientFromEnv();

    // Get all published posts
    const posts = await storageClient.listPosts({
        published: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navigation pageTitle="Blog" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <header className="mb-12 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
                        Blog
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                        Explore our collection of articles on programming, development, and technology.
                    </p>
                </header>

                {/* Search Box */}
                <div className="mb-10">
                    <SearchBox posts={posts} />
                </div>

                {/* Posts List */}
                {posts.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <HiBookOpen className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium">
                            No blog posts yet. Check back soon!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {posts.map((post) => (
                            <article
                                key={post.slug}
                                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md p-6 sm:p-8"
                            >
                                <Link href={`/blog/${post.slug}`}>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-zinc-50 mb-3 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                                        {post.title}
                                    </h2>
                                </Link>

                                {post.description && (
                                    <p className="text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
                                        {post.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                                    <div className="flex flex-wrap items-center gap-4 text-zinc-500 dark:text-zinc-500">
                                        {post.author && (
                                            <span>By {post.author}</span>
                                        )}
                                        <time dateTime={post.createdAt.toISOString()}>
                                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </time>
                                    </div>

                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {post.tags.slice(0, 3).map((tag, index) => {
                                                // Subtle, professional color palette
                                                const tagColors = [
                                                    'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
                                                    'bg-stone-100 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
                                                    'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                                                ];
                                                return (
                                                    <span
                                                        key={tag}
                                                        className={`px-2.5 py-1 rounded text-xs font-medium ${tagColors[index % tagColors.length]}`}
                                                    >
                                                        {tag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={`/blog/${post.slug}`}
                                    className="inline-flex items-center gap-2 mt-6 text-black dark:text-zinc-50 font-medium hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                >
                                    Read more
                                    <HiArrowRight className="w-4 h-4" />
                                </Link>
                            </article>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-12 pt-6 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition-colors font-medium"
                    >
                        <HiArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </footer>
            </div>
        </div>
    );
}
