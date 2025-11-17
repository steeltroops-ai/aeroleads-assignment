'use client';

/**
 * Table of Contents Component
 * 
 * Displays a navigable table of contents with active section highlighting
 */

import { useEffect, useState } from 'react';
import type { TOCItem } from '@/lib/markdown';

interface TableOfContentsProps {
    items: TOCItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        // Create intersection observer to track which heading is in view
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                rootMargin: '-80px 0px -80% 0px',
            }
        );

        // Observe all headings
        items.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [items]);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 80; // Account for fixed header if any
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                Table of Contents
            </h2>
            <nav>
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
                        >
                            <a
                                href={`#${item.id}`}
                                onClick={(e) => handleClick(e, item.id)}
                                className={`block text-sm transition-colors ${activeId === item.id
                                    ? 'text-black dark:text-zinc-50 font-medium'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50'
                                    }`}
                            >
                                {item.text}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}
