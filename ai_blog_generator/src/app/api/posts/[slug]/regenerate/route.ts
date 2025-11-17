/**
 * Post Regeneration API
 * 
 * POST /api/posts/[slug]/regenerate - Regenerate post content using LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorageClientFromEnv, BlogPost, PostNotFoundError } from '@/lib/storage';
import { createLLMClientFromEnv } from '@/lib/llm';

interface RouteContext {
    params: Promise<{ slug: string }>;
}

async function planBlogStructure(
    title: string,
    tone: string,
    length: string,
    llmClient: ReturnType<typeof createLLMClientFromEnv>
): Promise<string | null> {
    try {
        const planningPrompt = `Analyze this blog title and create a brief outline (3-5 bullet points):

Title: "${title}"
Tone: ${tone}
Length: ${length}

List the main sections that would best serve readers searching for this topic.`;

        const planResponse = await llmClient.generateContent(planningPrompt, {
            temperature: 0.7,
            maxTokens: 1000,
        });

        return planResponse.content;
    } catch (error) {
        // If planning fails, return null and use fallback
        console.warn('Structure planning failed, using fallback:', error);
        return null;
    }
}

function buildSimplePrompt(title: string, tone: string, length: string, outlineStyle?: string): string {
    const lengthGuide = {
        short: 'concise and focused, covering key points efficiently',
        medium: 'comprehensive with good depth, covering main topics thoroughly',
        long: 'extensive and detailed, exploring topics in-depth with examples and explanations',
    };

    const toneGuide = {
        professional: 'professional and authoritative',
        casual: 'conversational and approachable',
        technical: 'technical and detailed with code examples',
    };

    let prompt = `Write a complete blog post about: "${title}"

Requirements:
- Tone: ${toneGuide[tone as keyof typeof toneGuide]}
- Style: ${lengthGuide[length as keyof typeof lengthGuide]}
- Format: Markdown with proper headings (##, ###), lists, and code blocks where appropriate
- Structure: Introduction, 3-5 main content sections, and conclusion
- IMPORTANT: Write a COMPLETE article with a proper conclusion. Do not stop mid-sentence.
`;

    if (outlineStyle) {
        prompt += `- Additional Style: ${outlineStyle}\n`;
    }

    prompt += `
Write the complete blog post in markdown format. Do not include the title as a heading (it will be added separately).
Start directly with the introduction paragraph and ensure you finish with a complete conclusion section.`;

    return prompt;
}

function buildPrompt(title: string, tone: string, length: string, structurePlan: string, outlineStyle?: string): string {
    const lengthGuide = {
        short: 'concise and focused, covering key points efficiently',
        medium: 'comprehensive with good depth, covering main topics thoroughly',
        long: 'extensive and detailed, exploring topics in-depth with examples and explanations',
    };

    const toneGuide = {
        professional: 'professional and authoritative',
        casual: 'conversational and approachable',
        technical: 'technical and detailed with code examples',
    };

    let prompt = `Write a complete, high-quality blog post about: "${title}"

CONTENT STRATEGY & STRUCTURE:
${structurePlan}

WRITING REQUIREMENTS:
- Tone: ${toneGuide[tone as keyof typeof toneGuide]}
- Style: ${lengthGuide[length as keyof typeof lengthGuide]}
- Format: Markdown with proper headings (##, ###), lists, code blocks, and examples where appropriate
`;

    if (outlineStyle) {
        prompt += `- Additional Style Notes: ${outlineStyle}\n`;
    }

    prompt += `
IMPORTANT INSTRUCTIONS:
1. Follow the structure plan above, but write naturally and engagingly
2. Focus on what the reader actually needs to know
3. Include practical examples, explanations, and actionable insights
4. Write a COMPLETE article with a proper conclusion
5. Do NOT stop mid-sentence or mid-section
6. Ensure the content feels ${length} in length naturally
7. Do not include the title as a heading (it will be added separately)
8. Start directly with an engaging introduction paragraph

Write the complete blog post now in markdown format:`;

    return prompt;
}

export async function POST(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        const body = await request.json();

        const tone = body.tone || 'professional';
        const length = body.length || 'medium';
        const outlineStyle = body.outlineStyle;

        // Validate tone and length
        if (!['professional', 'casual', 'technical'].includes(tone)) {
            return NextResponse.json(
                { success: false, error: 'Invalid tone. Must be: professional, casual, or technical' },
                { status: 400 }
            );
        }

        if (!['short', 'medium', 'long'].includes(length)) {
            return NextResponse.json(
                { success: false, error: 'Invalid length. Must be: short, medium, or long' },
                { status: 400 }
            );
        }

        const storageClient = createStorageClientFromEnv();
        const llmClient = createLLMClientFromEnv();

        // Get existing post
        const existingPost = await storageClient.readPost(slug);

        // Step 1: AI plans the structure based on user intent (optional)
        const structurePlan = await planBlogStructure(existingPost.title, tone, length, llmClient);

        // Step 2: Build prompt with the AI-generated structure
        const prompt = structurePlan
            ? buildPrompt(existingPost.title, tone, length, structurePlan, outlineStyle)
            : buildSimplePrompt(existingPost.title, tone, length, outlineStyle);

        // Step 3: Generate new content with higher token limits to avoid cutoff
        const response = await llmClient.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: length === 'long' ? 16000 : length === 'medium' ? 8000 : 4000,
        });

        // Update post with new content
        const updatedPost: BlogPost = {
            ...existingPost,
            content: response.content,
            updatedAt: new Date(),
        };

        await storageClient.writePost(slug, updatedPost);

        return NextResponse.json({
            success: true,
            post: updatedPost,
            message: 'Post regenerated successfully',
        });
    } catch (error) {
        if (error instanceof PostNotFoundError) {
            return NextResponse.json(
                { success: false, error: 'Post not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to regenerate post'
            },
            { status: 500 }
        );
    }
}
