/**
 * Health Check API
 * 
 * Provides endpoints for monitoring application health and status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLLMClientFromEnv } from '@/lib/llm';
import { createStorageClientFromEnv } from '@/lib/storage';
import fs from 'fs';
import os from 'os';

interface HealthCheck {
    status: 'ok' | 'error' | 'warning' | 'skipped';
    message?: string;
    responseTimeMs?: number;
    details?: any;
}

interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    service: string;
    version: string;
    checks?: {
        llm: HealthCheck;
        storage: HealthCheck;
        disk: HealthCheck;
        memory: HealthCheck;
    };
}

/**
 * Check LLM provider connectivity
 */
async function checkLLM(): Promise<HealthCheck> {
    try {
        const startTime = Date.now();
        const llmClient = createLLMClientFromEnv();
        const isValid = await llmClient.validateApiKey();
        const duration = Date.now() - startTime;

        if (isValid) {
            return {
                status: 'ok',
                responseTimeMs: duration,
                message: 'LLM provider is accessible',
            };
        } else {
            return {
                status: 'error',
                message: 'LLM API key validation failed',
            };
        }
    } catch (error) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check storage accessibility
 */
async function checkStorage(): Promise<HealthCheck> {
    try {
        const startTime = Date.now();
        const storageClient = createStorageClientFromEnv();

        // Try to list posts
        await storageClient.listPosts();
        const duration = Date.now() - startTime;

        return {
            status: 'ok',
            responseTimeMs: duration,
            message: 'Storage is accessible',
        };
    } catch (error) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check disk space
 */
function checkDisk(): HealthCheck {
    try {
        const contentDir = process.cwd() + '/content';

        // Check if content directory exists
        if (!fs.existsSync(contentDir)) {
            return {
                status: 'warning',
                message: 'Content directory does not exist',
            };
        }

        // Get disk stats (simplified - works on most systems)
        const stats = fs.statfsSync ? fs.statfsSync(contentDir) : null;

        if (stats) {
            const totalBytes = stats.blocks * stats.bsize;
            const freeBytes = stats.bfree * stats.bsize;
            const usedPercent = ((totalBytes - freeBytes) / totalBytes) * 100;

            return {
                status: usedPercent > 90 ? 'warning' : 'ok',
                details: {
                    totalGB: (totalBytes / 1024 / 1024 / 1024).toFixed(2),
                    freeGB: (freeBytes / 1024 / 1024 / 1024).toFixed(2),
                    usedPercent: usedPercent.toFixed(2),
                },
            };
        }

        return {
            status: 'ok',
            message: 'Disk check completed (limited info available)',
        };
    } catch (error) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
    try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const usedPercent = (usedMemory / totalMemory) * 100;

        return {
            status: usedPercent > 90 ? 'warning' : 'ok',
            details: {
                totalMB: (totalMemory / 1024 / 1024).toFixed(2),
                freeMB: (freeMemory / 1024 / 1024).toFixed(2),
                usedPercent: usedPercent.toFixed(2),
            },
        };
    } catch (error) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * GET /api/health - Basic health check
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    const baseResponse: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'ai-blog-generator',
        version: process.env.APP_VERSION || '1.0.0',
    };

    // If not detailed, return basic health check
    if (!detailed) {
        return NextResponse.json(baseResponse);
    }

    // Perform detailed health checks
    const checks = {
        llm: await checkLLM(),
        storage: await checkStorage(),
        disk: checkDisk(),
        memory: checkMemory(),
    };

    // Determine overall status
    const hasError = Object.values(checks).some(check => check.status === 'error');
    const hasWarning = Object.values(checks).some(check => check.status === 'warning');

    const overallStatus = hasError ? 'error' : hasWarning ? 'degraded' : 'ok';
    const statusCode = hasError ? 503 : 200;

    return NextResponse.json(
        {
            ...baseResponse,
            status: overallStatus,
            checks,
        },
        { status: statusCode }
    );
}
