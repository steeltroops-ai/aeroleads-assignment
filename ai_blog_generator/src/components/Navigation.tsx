/**
 * Navigation Component
 * 
 * Responsive navigation bar with mobile menu support
 */

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface NavigationProps {
    hideUntilScroll?: boolean;
    pageTitle?: string;
}

export default function Navigation({ hideUntilScroll = false, pageTitle }: NavigationProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(!hideUntilScroll);

    useEffect(() => {
        if (!hideUntilScroll) return;

        const handleScroll = () => {
            const scrolled = window.scrollY > 100;
            setIsVisible(scrolled);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hideUntilScroll]);

    return (
        <nav className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and page title */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="group flex items-center gap-3">
                            <span className="text-3xl font-bold tracking-tighter text-black dark:text-zinc-50 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                ABG
                            </span>
                        </Link>
                        {pageTitle && (
                            <>
                                <div className="hidden md:block text-zinc-300 dark:text-zinc-700 text-2xl font-light">/</div>
                                <div className="hidden md:block text-base font-medium text-zinc-600 dark:text-zinc-400">
                                    {pageTitle}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Navigation links - moved to right */}
                    <div className="hidden sm:flex sm:items-center sm:space-x-2">
                        <Link
                            href="/"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        >
                            Home
                        </Link>
                        <Link
                            href="/blog"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        >
                            Blog
                        </Link>
                        <Link
                            href="/manage"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        >
                            Manage
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-500 transition-all"
                            aria-controls="mobile-menu"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {!mobileMenuOpen ? (
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md" id="mobile-menu">
                    <div className="pt-2 pb-3 space-y-1 px-2">
                        <Link
                            href="/"
                            className="block px-4 py-3 rounded-lg text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            href="/blog"
                            className="block px-4 py-3 rounded-lg text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Blog
                        </Link>
                        <Link
                            href="/manage"
                            className="block px-4 py-3 rounded-lg text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Manage
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
