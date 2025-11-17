'use client';

/**
 * Client-side Management Interface
 * 
 * Handles interactive features:
 * - Post filtering and search
 * - Bulk selection
 * - Publish/unpublish actions
 * - Delete actions
 * - Navigation to editor
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { BlogPost } from '@/lib/storage';
import { HiPencil, HiEye, HiCheck, HiX, HiTrash, HiArrowLeft, HiCheckCircle, HiXCircle, HiPlus, HiSearch } from 'react-icons/hi';

interface ManagementClientProps {
    initialPosts: BlogPost[];
}

export default function ManagementClient({ initialPosts }: ManagementClientProps) {
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filter and search posts
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            // Filter by status
            if (filter === 'published' && !post.published) return false;
            if (filter === 'unpublished' && post.published) return false;

            // Search by title or content
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    post.title.toLowerCase().includes(query) ||
                    post.content.toLowerCase().includes(query) ||
                    post.tags?.some(tag => tag.toLowerCase().includes(query))
                );
            }

            return true;
        });
    }, [posts, filter, searchQuery]);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const refreshPosts = async () => {
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();
            if (data.success) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Failed to refresh posts:', error);
        }
    };

    const handleSelectAll = () => {
        if (selectedSlugs.size === filteredPosts.length) {
            setSelectedSlugs(new Set());
        } else {
            setSelectedSlugs(new Set(filteredPosts.map(p => p.slug)));
        }
    };

    const handleSelectPost = (slug: string) => {
        const newSelected = new Set(selectedSlugs);
        if (newSelected.has(slug)) {
            newSelected.delete(slug);
        } else {
            newSelected.add(slug);
        }
        setSelectedSlugs(newSelected);
    };

    const handleBulkOperation = async (operation: 'publish' | 'unpublish' | 'delete') => {
        if (selectedSlugs.size === 0) {
            showMessage('error', 'No posts selected');
            return;
        }

        const confirmMessage = operation === 'delete'
            ? `Are you sure you want to delete ${selectedSlugs.size} post(s)? This cannot be undone.`
            : `Are you sure you want to ${operation} ${selectedSlugs.size} post(s)?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/posts/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation,
                    slugs: Array.from(selectedSlugs),
                }),
            });

            const data = await response.json();
            if (data.success) {
                showMessage('success', data.message);
                setSelectedSlugs(new Set());
                await refreshPosts();
            } else {
                showMessage('error', data.error || 'Operation failed');
            }
        } catch (error) {
            showMessage('error', 'Failed to perform operation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePublish = async (slug: string, currentStatus: boolean) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/posts/${slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ published: !currentStatus }),
            });

            const data = await response.json();
            if (data.success) {
                showMessage('success', data.message);
                await refreshPosts();
            } else {
                showMessage('error', data.error || 'Failed to update post');
            }
        } catch (error) {
            showMessage('error', 'Failed to update post');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/posts/${slug}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (data.success) {
                showMessage('success', data.message);
                await refreshPosts();
            } else {
                showMessage('error', data.error || 'Failed to delete post');
            }
        } catch (error) {
            showMessage('error', 'Failed to delete post');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Message Banner */}
            {message && (
                <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success'
                    ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-black dark:text-zinc-50'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-black dark:text-zinc-50'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Controls */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                    {/* Left: Search and Filter Tabs */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-black dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="inline-flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('published')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'published'
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
                                    }`}
                            >
                                Published
                            </button>
                            <button
                                onClick={() => setFilter('unpublished')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'unpublished'
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
                                    }`}
                            >
                                Drafts
                            </button>
                        </div>
                    </div>

                    {/* Right: Create Button */}
                    <Link
                        href="/manage/create"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all font-medium shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                        <HiPlus className="w-5 h-5" />
                        <span>New Post</span>
                    </Link>
                </div>

                {/* Bulk Actions */}
                {selectedSlugs.size > 0 && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 py-2 font-medium">
                            {selectedSlugs.size} selected
                        </span>
                        <button
                            onClick={() => handleBulkOperation('publish')}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            <HiCheckCircle className="w-4 h-4" />
                            Publish
                        </button>
                        <button
                            onClick={() => handleBulkOperation('unpublish')}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            <HiXCircle className="w-4 h-4" />
                            Unpublish
                        </button>
                        <button
                            onClick={() => handleBulkOperation('delete')}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            <HiTrash className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Posts Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead className="bg-zinc-50 dark:bg-black">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedSlugs.size === filteredPosts.length && filteredPosts.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-zinc-300 dark:border-zinc-700"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Updated
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                            {filteredPosts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-600 dark:text-zinc-400">
                                        No posts found
                                    </td>
                                </tr>
                            ) : (
                                filteredPosts.map((post) => (
                                    <tr key={post.slug} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedSlugs.has(post.slug)}
                                                onChange={() => handleSelectPost(post.slug)}
                                                className="rounded border-zinc-300 dark:border-zinc-700"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-black dark:text-zinc-50">
                                                {post.title}
                                            </div>
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="flex gap-1 mt-2">
                                                    {post.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${post.published
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                {post.published ? 'Published' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                                            {new Date(post.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex justify-end gap-4">
                                                <Link
                                                    href={`/manage/edit/${post.slug}`}
                                                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                                    title="Edit post"
                                                >
                                                    <HiPencil className="w-4 h-4" />
                                                    <span>Edit</span>
                                                </Link>
                                                <Link
                                                    href={`/blog/${post.slug}`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                                                    title="Preview post"
                                                >
                                                    <HiEye className="w-4 h-4" />
                                                    <span>Preview</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleTogglePublish(post.slug, post.published)}
                                                    disabled={isLoading}
                                                    className={`inline-flex items-center gap-1 disabled:opacity-50 transition-colors ${post.published
                                                        ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
                                                        : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
                                                        }`}
                                                    title={post.published ? 'Unpublish post' : 'Publish post'}
                                                >
                                                    {post.published ? <HiX className="w-4 h-4" /> : <HiCheck className="w-4 h-4" />}
                                                    <span>{post.published ? 'Unpublish' : 'Publish'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.slug)}
                                                    disabled={isLoading}
                                                    className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                                                    title="Delete post"
                                                >
                                                    <HiTrash className="w-4 h-4" />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition-colors"
                >
                    <HiArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
