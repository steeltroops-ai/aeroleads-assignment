/**
 * Blog Management Dashboard
 * 
 * Provides interface for managing blog posts:
 * - View all posts (published and unpublished)
 * - Publish/unpublish posts
 * - Edit post content
 * - Regenerate posts
 * - Delete posts
 * - Bulk operations
 */

import { createStorageClientFromEnv } from '@/lib/storage';
import ManagementClient from './ManagementClient';
import Navigation from '@/components/Navigation';

export const dynamic = 'force-dynamic';

export default async function ManagePage() {
    const storageClient = createStorageClientFromEnv();

    // Get all posts (published and unpublished)
    const allPosts = await storageClient.listPosts({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
    });

    const publishedCount = allPosts.filter(p => p.published).length;
    const unpublishedCount = allPosts.filter(p => !p.published).length;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Navigation pageTitle="Manage Posts" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <header className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black dark:text-zinc-50 mb-3">
                        Manage Posts
                    </h1>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">
                        Manage your blog posts, edit content, and control publishing status
                    </p>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 text-center shadow-sm">
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1.5 uppercase tracking-wide font-medium">Total</div>
                        <div className="text-3xl font-bold text-black dark:text-zinc-50">{allPosts.length}</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 text-center shadow-sm">
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1.5 uppercase tracking-wide font-medium">Published</div>
                        <div className="text-3xl font-bold text-black dark:text-zinc-50">{publishedCount}</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 text-center shadow-sm">
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1.5 uppercase tracking-wide font-medium">Drafts</div>
                        <div className="text-3xl font-bold text-black dark:text-zinc-50">{unpublishedCount}</div>
                    </div>
                </div>

                {/* Management Interface */}
                <ManagementClient initialPosts={allPosts} />
            </div>
        </div>
    );
}
