/**
 * Unit tests for LLM Provider Abstraction
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
    LLMClient,
    createLLMClient,
    createLLMClientFromEnv,
    LLMError,
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMNetworkError,
    type LLMConfig,
    type GenerationOptions,
} from '../src/lib/llm';

// Mock the OpenAI and Google Generative AI modules
jest.mock('openai');
jest.mock('@google/generative-ai');

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('LLM Provider Abstraction', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // ============================================================================
    // OpenAI Provider Tests
    // ============================================================================

    describe('OpenAI Provider', () => {
        it('should generate content successfully', async () => {
            const mockCreate = jest.fn().mockResolvedValue({
                choices: [{ message: { content: 'Generated content from OpenAI' } }],
                model: 'gpt-4o-mini',
                usage: { total_tokens: 150 },
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-openai-key',
            };

            const client = createLLMClient(config);
            const response = await client.generateContent('Test prompt');

            expect(response.content).toBe('Generated content from OpenAI');
            expect(response.provider).toBe('openai');
            expect(response.model).toBe('gpt-4o-mini');
            expect(response.tokensUsed).toBe(150);
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: 'Test prompt' }],
                    temperature: 0.7,
                    max_tokens: 2000,
                })
            );
        });

        it('should use custom model and options', async () => {
            const mockCreate = jest.fn().mockResolvedValue({
                choices: [{ message: { content: 'Custom model response' } }],
                model: 'gpt-4',
                usage: { total_tokens: 200 },
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-openai-key',
                model: 'gpt-4',
            };

            const options: GenerationOptions = {
                temperature: 0.9,
                maxTokens: 3000,
                topP: 0.95,
            };

            const client = createLLMClient(config);
            await client.generateContent('Test prompt', options);

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4',
                    temperature: 0.9,
                    max_tokens: 3000,
                    top_p: 0.95,
                })
            );
        });

        it('should throw LLMAuthenticationError on 401', async () => {
            const mockCreate = jest.fn().mockRejectedValue({
                status: 401,
                message: 'Invalid API key',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'invalid-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMAuthenticationError);
        });

        it('should throw LLMRateLimitError on 429', async () => {
            const mockCreate = jest.fn().mockRejectedValue({
                status: 429,
                message: 'Rate limit exceeded',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMRateLimitError);
        });

        it('should validate API key successfully', async () => {
            const mockList = jest.fn().mockResolvedValue({ data: [] });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                models: {
                    list: mockList,
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'valid-key',
            };

            const client = createLLMClient(config);
            const isValid = await client.validateApiKey();

            expect(isValid).toBe(true);
            expect(mockList).toHaveBeenCalled();
        });

        it('should return false for invalid API key', async () => {
            const mockList = jest.fn().mockRejectedValue(new Error('Invalid key'));

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                models: {
                    list: mockList,
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'invalid-key',
            };

            const client = createLLMClient(config);
            const isValid = await client.validateApiKey();

            expect(isValid).toBe(false);
        });
    });

    // ============================================================================
    // Gemini Provider Tests
    // ============================================================================

    describe('Gemini Provider', () => {
        it('should generate content successfully', async () => {
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Generated content from Gemini' }],
                            },
                            finishReason: 'STOP',
                        },
                    ],
                    text: () => 'Generated content from Gemini',
                    usageMetadata: { totalTokenCount: 120 },
                },
            });

            const mockGetGenerativeModel = jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            });

            (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
                getGenerativeModel: mockGetGenerativeModel,
            } as any));

            const config: LLMConfig = {
                provider: 'gemini',
                apiKey: 'test-gemini-key',
            };

            const client = createLLMClient(config);
            const response = await client.generateContent('Test prompt');

            expect(response.content).toBe('Generated content from Gemini');
            expect(response.provider).toBe('gemini');
            expect(response.model).toBe('gemini-1.5-flash');
            expect(response.tokensUsed).toBe(120);
        });

        it('should use custom model', async () => {
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Custom model response' }],
                            },
                            finishReason: 'STOP',
                        },
                    ],
                    text: () => 'Custom model response',
                    usageMetadata: { totalTokenCount: 100 },
                },
            });

            const mockGetGenerativeModel = jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            });

            (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
                getGenerativeModel: mockGetGenerativeModel,
            } as any));

            const config: LLMConfig = {
                provider: 'gemini',
                apiKey: 'test-gemini-key',
                model: 'gemini-pro',
            };

            const client = createLLMClient(config);
            await client.generateContent('Test prompt');

            expect(mockGetGenerativeModel).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gemini-pro',
                })
            );
        });

        it('should throw LLMAuthenticationError on invalid API key', async () => {
            const mockGenerateContent = jest.fn().mockRejectedValue({
                message: 'API_KEY_INVALID',
            });

            const mockGetGenerativeModel = jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            });

            (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
                getGenerativeModel: mockGetGenerativeModel,
            } as any));

            const config: LLMConfig = {
                provider: 'gemini',
                apiKey: 'invalid-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMAuthenticationError);
        });

        it('should throw LLMRateLimitError on quota exceeded', async () => {
            const mockGenerateContent = jest.fn().mockRejectedValue({
                status: 429,
                message: 'quota exceeded',
            });

            const mockGetGenerativeModel = jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            });

            (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
                getGenerativeModel: mockGetGenerativeModel,
            } as any));

            const config: LLMConfig = {
                provider: 'gemini',
                apiKey: 'test-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMRateLimitError);
        });
    });

    // ============================================================================
    // Perplexity Provider Tests
    // ============================================================================

    describe('Perplexity Provider', () => {
        it('should generate content successfully', async () => {
            const mockCreate = jest.fn().mockResolvedValue({
                choices: [{ message: { content: 'Generated content from Perplexity' } }],
                model: 'llama-3.1-sonar-small-128k-online',
                usage: { total_tokens: 180 },
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation((config: any) => {
                if (config?.baseURL === 'https://api.perplexity.ai') {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate,
                            },
                        },
                    } as any;
                }
                return {} as any;
            });

            const config: LLMConfig = {
                provider: 'perplexity',
                apiKey: 'test-perplexity-key',
            };

            const client = createLLMClient(config);
            const response = await client.generateContent('Test prompt');

            expect(response.content).toBe('Generated content from Perplexity');
            expect(response.provider).toBe('perplexity');
            expect(response.tokensUsed).toBe(180);
        });

        it('should throw LLMAuthenticationError on 401', async () => {
            const mockCreate = jest.fn().mockRejectedValue({
                status: 401,
                message: 'Invalid API key',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation((config: any) => {
                if (config?.baseURL === 'https://api.perplexity.ai') {
                    return {
                        chat: {
                            completions: {
                                create: mockCreate,
                            },
                        },
                    } as any;
                }
                return {} as any;
            });

            const config: LLMConfig = {
                provider: 'perplexity',
                apiKey: 'invalid-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMAuthenticationError);
        });
    });

    // ============================================================================
    // Retry Logic Tests
    // ============================================================================

    describe('Retry Logic', () => {
        it('should retry on rate limit errors', async () => {
            const mockCreate = jest
                .fn()
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockRejectedValueOnce({ status: 429, message: 'Rate limit' })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: 'Success after retries' } }],
                    model: 'gpt-4o-mini',
                    usage: { total_tokens: 100 },
                });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                retryAttempts: 3,
                retryDelay: 10, // Short delay for testing
            };

            const client = createLLMClient(config);
            const response = await client.generateContent('Test');

            expect(response.content).toBe('Success after retries');
            expect(mockCreate).toHaveBeenCalledTimes(3);
        });

        it('should retry on network errors', async () => {
            const mockCreate = jest
                .fn()
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: 'Success after network retry' } }],
                    model: 'gpt-4o-mini',
                    usage: { total_tokens: 100 },
                });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                retryAttempts: 2,
                retryDelay: 10,
            };

            const client = createLLMClient(config);
            const response = await client.generateContent('Test');

            expect(response.content).toBe('Success after network retry');
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });

        it('should not retry on authentication errors', async () => {
            const mockCreate = jest.fn().mockRejectedValue({
                status: 401,
                message: 'Invalid API key',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'invalid-key',
                retryAttempts: 3,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMAuthenticationError);
            expect(mockCreate).toHaveBeenCalledTimes(1); // No retries
        });

        it('should throw after max retries', async () => {
            const mockCreate = jest.fn().mockRejectedValue({
                status: 429,
                message: 'Rate limit',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                retryAttempts: 2,
                retryDelay: 10,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMRateLimitError);
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });
    });

    // ============================================================================
    // Factory Function Tests
    // ============================================================================

    describe('Factory Functions', () => {
        it('should create client from environment variables', () => {
            process.env.LLM_PROVIDER = 'openai';
            process.env.OPENAI_API_KEY = 'test-key';

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({} as any));

            const client = createLLMClientFromEnv();

            expect(client).toBeInstanceOf(LLMClient);
            expect(client.getProvider()).toBe('openai');
        });

        it('should default to openai if provider not specified', () => {
            delete process.env.LLM_PROVIDER;
            process.env.OPENAI_API_KEY = 'test-key';

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({} as any));

            const client = createLLMClientFromEnv();

            expect(client.getProvider()).toBe('openai');
        });

        it('should throw if API key not found', () => {
            process.env.LLM_PROVIDER = 'openai';
            delete process.env.OPENAI_API_KEY;

            expect(() => createLLMClientFromEnv()).toThrow('API key not found for provider: openai');
        });

        it('should create gemini client from env', () => {
            process.env.LLM_PROVIDER = 'gemini';
            process.env.GEMINI_API_KEY = 'test-gemini-key';

            (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({} as any));

            const client = createLLMClientFromEnv();

            expect(client.getProvider()).toBe('gemini');
        });

        it('should throw on unsupported provider', () => {
            const config: LLMConfig = {
                provider: 'unsupported' as any,
                apiKey: 'test-key',
            };

            expect(() => createLLMClient(config)).toThrow('Unsupported provider: unsupported');
        });
    });

    // ============================================================================
    // Error Handling Tests
    // ============================================================================

    describe('Error Handling', () => {
        it('should throw LLMError for generic errors', async () => {
            const mockCreate = jest.fn().mockRejectedValue(new Error('Generic error'));

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                retryAttempts: 1,
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow(LLMError);
        });

        it('should throw error if no content in response', async () => {
            const mockCreate = jest.fn().mockResolvedValue({
                choices: [{ message: {} }],
                model: 'gpt-4o-mini',
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
                chat: {
                    completions: {
                        create: mockCreate,
                    },
                },
            } as any));

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
            };

            const client = createLLMClient(config);

            await expect(client.generateContent('Test')).rejects.toThrow('No content in OpenAI response');
        });
    });
});
