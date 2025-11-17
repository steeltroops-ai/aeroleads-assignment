/**
 * Blog Content Generation API
 * 
 * POST /api/generate
 * 
 * Generates blog posts from a list of titles using configured LLM provider.
 * Supports batch generation with configurable tone, length, and outline style.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLLMClientFromEnv, LLMError, LLMAuthenticationError, LLMRateLimitError } from '@/lib/llm';
import { createStorageClientFromEnv, generateSlug, BlogPost } from '@/lib/storage';
import { detectArticleType, buildPromptFromTemplate, getTemplate, ArticleType } from '@/lib/content-templates';
import { generateSEOMetadata } from '@/lib/seo';
import { createVersioningClient } from '@/lib/versioning';

// ============================================================================
// Types
// ============================================================================

interface GenerateRequest {
    titles: string[];
    tone?: string; // Can be basic tones or MBTI types
    length?: 'short' | 'medium' | 'long';
    outlineStyle?: string;
    tags?: string[];
    author?: string;
    publish?: boolean;
    template?: ArticleType;
    enableVersioning?: boolean;
    provider?: 'perplexity'; // Optional provider override
    autoGenerateTags?: boolean; // Auto-generate tags from content
}

interface GenerateResponse {
    success: boolean;
    posts?: Array<{
        slug: string;
        title: string;
        status: 'success' | 'error';
        error?: string;
    }>;
    error?: string;
    message?: string;
}

// ============================================================================
// Rate Limiting (Simple in-memory implementation)
// ============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetAt < now) {
        rateLimitStore.delete(identifier);
    }

    const currentEntry = rateLimitStore.get(identifier);

    if (!currentEntry) {
        // First request
        rateLimitStore.set(identifier, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW,
        });
        return {
            allowed: true,
            remaining: RATE_LIMIT_MAX_REQUESTS - 1,
            resetAt: now + RATE_LIMIT_WINDOW,
        };
    }

    if (currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: currentEntry.resetAt,
        };
    }

    // Increment count
    currentEntry.count++;
    return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - currentEntry.count,
        resetAt: currentEntry.resetAt,
    };
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(body: any): { valid: boolean; error?: string; data?: GenerateRequest } {
    // Check if body exists
    if (!body) {
        return { valid: false, error: 'Request body is required' };
    }

    // Validate titles
    if (!body.titles || !Array.isArray(body.titles)) {
        return { valid: false, error: 'titles must be an array' };
    }

    if (body.titles.length === 0) {
        return { valid: false, error: 'titles array cannot be empty' };
    }

    if (body.titles.length > 50) {
        return { valid: false, error: 'Maximum 50 titles allowed per request' };
    }

    // Validate each title
    for (const title of body.titles) {
        if (typeof title !== 'string' || title.trim().length === 0) {
            return { valid: false, error: 'All titles must be non-empty strings' };
        }
        if (title.length > 200) {
            return { valid: false, error: 'Title length cannot exceed 200 characters' };
        }
    }

    // Validate tone (basic tones or MBTI types)
    const validTones = [
        'professional', 'casual', 'technical',
        'INTJ', 'INTP', 'ENTJ', 'ENTP',
        'INFJ', 'INFP', 'ENFJ', 'ENFP',
        'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
        'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];
    if (body.tone && !validTones.includes(body.tone)) {
        return { valid: false, error: 'tone must be a valid basic tone or MBTI type' };
    }

    // Validate length
    if (body.length && !['short', 'medium', 'long'].includes(body.length)) {
        return { valid: false, error: 'length must be one of: short, medium, long' };
    }

    // Validate outlineStyle
    if (body.outlineStyle && typeof body.outlineStyle !== 'string') {
        return { valid: false, error: 'outlineStyle must be a string' };
    }

    // Validate tags
    if (body.tags && !Array.isArray(body.tags)) {
        return { valid: false, error: 'tags must be an array' };
    }

    // Validate author
    if (body.author && typeof body.author !== 'string') {
        return { valid: false, error: 'author must be a string' };
    }

    // Validate publish
    if (body.publish !== undefined && typeof body.publish !== 'boolean') {
        return { valid: false, error: 'publish must be a boolean' };
    }

    return {
        valid: true,
        data: {
            titles: body.titles,
            tone: body.tone || 'professional',
            length: body.length || 'medium',
            outlineStyle: body.outlineStyle,
            tags: body.tags || [],
            author: body.author,
            publish: body.publish ?? false,
        },
    };
}

// ============================================================================
// Content Generation
// ============================================================================

function extractTagsFromTitle(title: string): string[] {
    // Common stop words to exclude
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
        'how', 'what', 'when', 'where', 'why', 'which', 'who', 'your', 'my',
        'guide', 'tutorial', 'introduction', 'getting', 'started', 'complete',
        'ultimate', 'master', 'mastering', 'learn', 'learning'
    ]);

    // Extract words from title
    const words = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Keep hyphens for compound words
        .split(/\s+/)
        .filter(word => {
            // Filter out stop words and short words
            return word.length > 3 && !stopWords.has(word);
        });

    // Remove duplicates and limit to 5 tags
    const uniqueTags = [...new Set(words)].slice(0, 5);

    // If we have compound words with hyphens, keep them
    // Also convert spaces to hyphens for multi-word concepts
    return uniqueTags.map(tag => tag.replace(/\s+/g, '-'));
}

function getToneDescription(tone: string): string {
    const basicTones: Record<string, string> = {
        professional: 'professional and authoritative',
        casual: 'conversational and approachable',
        technical: 'technical and detailed with code examples',
    };

    const mbtiTones: Record<string, string> = {
        INTJ: 'strategic, analytical, and systematic like an INTJ Architect - focus on long-term vision and logical frameworks',
        INTP: 'innovative, theoretical, and intellectually curious like an INTP Logician - explore abstract concepts and possibilities',
        ENTJ: 'bold, decisive, and commanding like an ENTJ Commander - direct, efficient, and results-oriented',
        ENTP: 'quick-witted, clever, and debate-oriented like an ENTP Debater - challenge assumptions and explore alternatives',
        INFJ: 'insightful, inspiring, and meaningful like an INFJ Advocate - connect ideas to deeper purpose and values',
        INFP: 'idealistic, empathetic, and authentic like an INFP Mediator - write with heart and personal conviction',
        ENFJ: 'charismatic, motivating, and people-focused like an ENFJ Protagonist - inspire and guide readers',
        ENFP: 'enthusiastic, creative, and energetic like an ENFP Campaigner - bring passion and fresh perspectives',
        ISTJ: 'practical, reliable, and detail-oriented like an ISTJ Logistician - provide clear, factual information',
        ISFJ: 'dedicated, warm, and supportive like an ISFJ Defender - write with care and attention to reader needs',
        ESTJ: 'organized, direct, and efficient like an ESTJ Executive - structure content logically and clearly',
        ESFJ: 'caring, social, and helpful like an ESFJ Consul - write in a friendly, supportive manner',
        ISTP: 'bold, practical, and hands-on like an ISTP Virtuoso - focus on real-world application and problem-solving',
        ISFP: 'flexible, charming, and artistic like an ISFP Adventurer - write with creativity and personal flair',
        ESTP: 'energetic, perceptive, and action-oriented like an ESTP Entrepreneur - keep it dynamic and engaging',
        ESFP: 'spontaneous, enthusiastic, and entertaining like an ESFP Entertainer - make it fun and lively',
    };

    return mbtiTones[tone] || basicTones[tone] || basicTones.professional;
}

async function generatePost(
    title: string,
    config: GenerateRequest,
    llmClient: ReturnType<typeof createLLMClientFromEnv>,
    storageClient: ReturnType<typeof createStorageClientFromEnv>
): Promise<{ slug: string; title: string; status: 'success' | 'error'; error?: string }> {
    try {
        // Generate slug
        const slug = generateSlug(title);

        // Check if post already exists
        const exists = await storageClient.postExists(slug);
        if (exists) {
            return {
                slug,
                title,
                status: 'error',
                error: 'Post with this slug already exists',
            };
        }

        // Build prompt that asks AI to generate title + content together
        const prompt = `You are writing a blog post about: "${title}"

FIRST, create an engaging, catchy title (50-60 characters) for this blog.
THEN, write the complete blog post content.

Format:
TITLE: [Your engaging title here]

[Blog content in markdown format]

Tone: ${getToneDescription(config.tone!)}
Length: ${config.length}
${config.outlineStyle ? `Style: ${config.outlineStyle}` : ''}

Write the complete blog post now:`;

        // Step 3: Generate content with appropriate token limits
        const response = await llmClient.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: config.length === 'long' ? 16000 : config.length === 'medium' ? 8000 : 4000,
        });

        // Extract title from generated content
        let generatedTitle = title; // Default to input title
        let content = response.content;

        const titleMatch = content.match(/^TITLE:\s*(.+?)$/m);
        if (titleMatch && titleMatch[1]) {
            generatedTitle = titleMatch[1].trim();
            // Remove the TITLE: line from content
            content = content.replace(/^TITLE:\s*.+?\n\n?/m, '').trim();
            console.log('✅ Extracted title from AI:', generatedTitle);
        } else {
            console.log('⚠️ No title found in AI response, using input title');
        }

        // Auto-generate tags if requested
        let finalTags = config.tags || [];
        if (config.autoGenerateTags && (!config.tags || config.tags.length === 0)) {
            try {
                const tagPrompt = `Extract 3-5 subject-specific tags for this blog post. Focus on the main topics, technologies, or concepts discussed.

Title: ${generatedTitle}
Content: ${content.substring(0, 600)}...

Examples:
- For a Python tutorial: python, programming, web-development, tutorial
- For a startup guide: startup, entrepreneurship, business, funding
- For a tech article: technology, software, development, engineering

Output only the tags (lowercase, hyphenated if multi-word), comma-separated:`;

                const tagResponse = await llmClient.generateContent(tagPrompt, {
                    temperature: 0.5,
                    maxTokens: 150,
                });

                // Parse tags from response
                const parsedTags = tagResponse.content
                    .replace(/tags:/gi, '') // Remove "Tags:" prefix if present
                    .replace(/\n/g, ',') // Replace newlines with commas
                    .split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag && tag.length > 0 && tag.length < 30)
                    .slice(0, 5);

                if (parsedTags.length > 0) {
                    finalTags = parsedTags;
                    console.log(`Generated ${parsedTags.length} tags:`, parsedTags);
                } else {
                    throw new Error('No valid tags parsed from response');
                }
            } catch (error) {
                console.warn('Failed to auto-generate tags, using fallback:', error);
                // Fallback: Extract meaningful tags from generated title
                finalTags = extractTagsFromTitle(generatedTitle);
                console.log('Fallback tags from title:', finalTags);
            }
        }

        // Ensure we always have at least some meaningful tags
        if (finalTags.length === 0) {
            finalTags = extractTagsFromTitle(generatedTitle);
            console.log('Using extracted tags from title:', finalTags);
        }

        // If still no tags, use topic-based defaults
        if (finalTags.length === 0) {
            finalTags = ['tutorial', 'guide'];
            console.log('Using default tags:', finalTags);
        }

        // Regenerate slug from the AI-generated title
        const finalSlug = generateSlug(generatedTitle);

        // Create blog post object with AI-generated title
        const now = new Date();
        const post: BlogPost = {
            slug: finalSlug,
            title: generatedTitle,
            content: content,
            tags: finalTags,
            createdAt: now,
            updatedAt: now,
            published: config.publish || false,
            author: config.author,
            description: `A ${config.tone} blog post about ${generatedTitle}`,
        };

        // Generate SEO metadata
        const baseUrl = process.env.BLOG_BASE_URL || 'http://localhost:3000';
        const seoMetadata = generateSEOMetadata(post, baseUrl);

        // Update description with SEO-optimized version if not provided
        if (!post.description || post.description.includes('blog post about')) {
            post.description = seoMetadata.description;
        }

        // Save to storage with the AI-generated title
        await storageClient.writePost(finalSlug, post);

        // Create initial version if versioning is enabled
        if (config.enableVersioning) {
            const versioningClient = createVersioningClient();
            await versioningClient.createRevision(post, 'Initial version');
        }

        return {
            slug: finalSlug,
            title: generatedTitle,
            status: 'success',
        };
    } catch (error) {
        console.error(`Error generating post for "${title}":`, error);
        return {
            slug: generateSlug(title),
            title,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
    try {
        // Get client IP for rate limiting
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

        // Check rate limit
        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Rate limit exceeded',
                    message: `Too many requests. Please try again after ${new Date(rateLimit.resetAt).toISOString()}`,
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
                    },
                }
            );
        }

        // Parse request body
        let body: any;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON in request body',
                },
                { status: 400 }
            );
        }

        // Validate request
        const validation = validateRequest(body);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error,
                },
                { status: 400 }
            );
        }

        const config = validation.data!;

        // Initialize clients
        let llmClient: ReturnType<typeof createLLMClientFromEnv>;
        let storageClient: ReturnType<typeof createStorageClientFromEnv>;

        try {
            llmClient = createLLMClientFromEnv(config.provider);
            storageClient = createStorageClientFromEnv();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Server configuration error',
                    message: error instanceof Error ? error.message : 'Failed to initialize services',
                },
                { status: 500 }
            );
        }

        // Validate LLM API key
        try {
            const isValid = await llmClient.validateApiKey();
            if (!isValid) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid LLM API key',
                        message: 'Please check your API key configuration',
                    },
                    { status: 401 }
                );
            }
        } catch (error) {
            if (error instanceof LLMAuthenticationError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Authentication failed',
                        message: 'Invalid API key for LLM provider',
                    },
                    { status: 401 }
                );
            }
            // Continue if validation fails for other reasons (network, etc.)
        }

        // Generate posts
        const results = await Promise.all(
            config.titles.map(title => generatePost(title, config, llmClient, storageClient))
        );

        // Check if any posts were generated successfully
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        return NextResponse.json(
            {
                success: successCount > 0,
                posts: results,
                message: `Generated ${successCount} post(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            },
            {
                status: 200,
                headers: {
                    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    'X-RateLimit-Reset': rateLimit.resetAt.toString(),
                },
            }
        );
    } catch (error) {
        console.error('Unexpected error in generate API:', error);

        // Handle specific LLM errors
        if (error instanceof LLMAuthenticationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication failed',
                    message: 'Invalid API key for LLM provider',
                },
                { status: 401 }
            );
        }

        if (error instanceof LLMRateLimitError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'LLM rate limit exceeded',
                    message: 'The LLM provider rate limit has been exceeded. Please try again later.',
                },
                { status: 429 }
            );
        }

        if (error instanceof LLMError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'LLM generation failed',
                    message: error.message,
                },
                { status: 500 }
            );
        }

        // Generic error
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET Handler (for API documentation)
// ============================================================================

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        endpoint: '/api/generate',
        method: 'POST',
        description: 'Generate blog posts from titles using LLM',
        rateLimit: {
            maxRequests: RATE_LIMIT_MAX_REQUESTS,
            windowMs: RATE_LIMIT_WINDOW,
        },
        requestBody: {
            titles: {
                type: 'string[]',
                required: true,
                description: 'Array of blog post titles (max 50)',
            },
            tone: {
                type: 'string',
                required: false,
                default: 'professional',
                options: ['professional', 'casual', 'technical'],
            },
            length: {
                type: 'string',
                required: false,
                default: 'medium',
                options: ['short', 'medium', 'long'],
            },
            outlineStyle: {
                type: 'string',
                required: false,
                description: 'Custom outline style instructions',
            },
            tags: {
                type: 'string[]',
                required: false,
                default: [],
                description: 'Tags for the blog posts',
            },
            author: {
                type: 'string',
                required: false,
                description: 'Author name',
            },
            publish: {
                type: 'boolean',
                required: false,
                default: false,
                description: 'Whether to publish the posts immediately',
            },
        },
        example: {
            titles: ['Getting Started with TypeScript', 'Advanced React Patterns'],
            tone: 'technical',
            length: 'medium',
            tags: ['typescript', 'react'],
            author: 'John Doe',
            publish: false,
        },
    });
}
