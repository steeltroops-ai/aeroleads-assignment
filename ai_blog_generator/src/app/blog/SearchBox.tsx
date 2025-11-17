'use client';

/**
 * Client-side Search Component
 * 
 * Provides real-time search functionality for blog posts
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/lib/storage';
import { HiSearch } from 'react-icons/hi';

interface SearchBoxProps {
    posts: BlogPost[];
}

export default function SearchBox({ posts }: SearchBoxProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter posts based on search query
    const filteredPosts = useMemo(() => {
        if (!searchQuery.trim()) {
            return posts;
        }

        const query = searchQuery.toLowerCase();
        return posts.filter((post) => {
            // Search in title
            if (post.title.toLowerCase().includes(query)) {
                return true;
            }

            // Search in description
            if (post.description?.toLowerCase().includes(query)) {
                return true;
            }

            // Search in content
            if (post.content.toLowerCase().includes(query)) {
                return true;
            }

            // Search in tags
            if (post.tags?.some(tag => tag.toLowerCase().includes(query))) {
                return true;
            }

            return false;
        });
    }, [posts, searchQuery]);

    const showResults = searchQuery.trim().length > 0;

    return (
        <div className="relative">
            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-black dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-transparent transition-all"
                />
                <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500 dark:text-zinc-500" />
            </div>

            {/* Search Results */}
            {showResults && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 max-h-96 overflow-y-auto">
                    {filteredPosts.length === 0 ? (
                        <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
                            No articles found matching &quot;{searchQuery}&quot;
                        </div>
                    ) : (
                        <div className="p-2">
                            <div className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-medium">
                                Found {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
                            </div>
                            {filteredPosts.map((post) => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <h3 className="font-semibold text-black dark:text-zinc-50 mb-2">
                                        {post.title}
                                    </h3>
                                    {post.description && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">
                                            {post.description}
                                        </p>
                                    )}
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {post.tags.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
