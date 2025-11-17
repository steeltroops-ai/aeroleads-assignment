/**
 * Unit tests for Storage Provider Abstraction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
    StorageClient,
    createStorageClient,
    createStorageClientFromEnv,
    generateSlug,
    validatePost,
    StorageError,
    PostNotFoundError,
    InvalidPostError,
    type BlogPost,
    type StorageConfig,
} from '../src/lib/storage';

describe('Storage Provider Abstraction', () => {
    let tempDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        // Create a temporary directory for testing
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-storage-test-'));
        originalEnv = { ...process.env };
    });

    afterEach(async () => {
        // Clean up temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Failed to clean up temp directory:', error);
        }
        process.env = originalEnv;
    });

    // ============================================================================
    // Local Storage Provider Tests
    // ============================================================================

    describe('Local Storage Provider', () => {
        it('should write and read a blog post', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'test-post',
                title: 'Test Post',
                content: '# Test Post\n\nThis is a test post.',
                tags: ['test', 'example'],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
                published: true,
                author: 'Test Author',
                description: 'A test post description',
            };

            await client.writePost('test-post', post);
            const readPost = await client.readPost('test-post');

            expect(readPost.slug).toBe('test-post');
            expect(readPost.title).toBe('Test Post');
            expect(readPost.content).toBe('# Test Post\n\nThis is a test post.');
            expect(readPost.tags).toEqual(['test', 'example']);
            expect(readPost.published).toBe(true);
            expect(readPost.author).toBe('Test Author');
            expect(readPost.description).toBe('A test post description');
            expect(readPost.createdAt).toEqual(new Date('2024-01-01'));
            expect(readPost.updatedAt).toEqual(new Date('2024-01-02'));
        });

        it('should create directory if it does not exist', async () => {
            const nonExistentDir = path.join(tempDir, 'nested', 'directory');
            const config: StorageConfig = {
                provider: 'local',
                basePath: nonExistentDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'test',
                title: 'Test',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await client.writePost('test', post);

            // Verify directory was created
            const stats = await fs.stat(nonExistentDir);
            expect(stats.isDirectory()).toBe(true);
        });

        it('should sanitize slugs to prevent directory traversal', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: '../../../etc/passwd',
                title: 'Malicious Post',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await client.writePost('../../../etc/passwd', post);

            // Verify file was created in temp directory with sanitized name
            const files = await fs.readdir(tempDir);
            // The slug sanitization replaces non-alphanumeric chars with hyphens
            expect(files.some(f => f.includes('etc-passwd.md'))).toBe(true);
            expect(files).not.toContain('passwd.md');
        });

        it('should throw PostNotFoundError when reading non-existent post', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            await expect(client.readPost('non-existent')).rejects.toThrow(PostNotFoundError);
        });

        it('should delete a post', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'to-delete',
                title: 'To Delete',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await client.writePost('to-delete', post);
            expect(await client.postExists('to-delete')).toBe(true);

            await client.deletePost('to-delete');
            expect(await client.postExists('to-delete')).toBe(false);
        });

        it('should throw PostNotFoundError when deleting non-existent post', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            await expect(client.deletePost('non-existent')).rejects.toThrow(PostNotFoundError);
        });

        it('should list all posts', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const posts: BlogPost[] = [
                {
                    slug: 'post-1',
                    title: 'Post 1',
                    content: 'Content 1',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    published: true,
                },
                {
                    slug: 'post-2',
                    title: 'Post 2',
                    content: 'Content 2',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                    published: false,
                },
                {
                    slug: 'post-3',
                    title: 'Post 3',
                    content: 'Content 3',
                    createdAt: new Date('2024-01-03'),
                    updatedAt: new Date('2024-01-03'),
                    published: true,
                },
            ];

            for (const post of posts) {
                await client.writePost(post.slug, post);
            }

            const allPosts = await client.listPosts();
            expect(allPosts).toHaveLength(3);
        });

        it('should filter posts by published status', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const posts: BlogPost[] = [
                {
                    slug: 'published-1',
                    title: 'Published 1',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: true,
                },
                {
                    slug: 'draft-1',
                    title: 'Draft 1',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                },
                {
                    slug: 'published-2',
                    title: 'Published 2',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: true,
                },
            ];

            for (const post of posts) {
                await client.writePost(post.slug, post);
            }

            const publishedPosts = await client.listPosts({ published: true });
            expect(publishedPosts).toHaveLength(2);
            expect(publishedPosts.every(p => p.published)).toBe(true);

            const draftPosts = await client.listPosts({ published: false });
            expect(draftPosts).toHaveLength(1);
            expect(draftPosts[0].published).toBe(false);
        });

        it('should sort posts by createdAt descending by default', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const posts: BlogPost[] = [
                {
                    slug: 'old',
                    title: 'Old Post',
                    content: 'Content',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    published: true,
                },
                {
                    slug: 'new',
                    title: 'New Post',
                    content: 'Content',
                    createdAt: new Date('2024-01-03'),
                    updatedAt: new Date('2024-01-03'),
                    published: true,
                },
                {
                    slug: 'middle',
                    title: 'Middle Post',
                    content: 'Content',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                    published: true,
                },
            ];

            for (const post of posts) {
                await client.writePost(post.slug, post);
            }

            const sortedPosts = await client.listPosts();
            expect(sortedPosts[0].slug).toBe('new');
            expect(sortedPosts[1].slug).toBe('middle');
            expect(sortedPosts[2].slug).toBe('old');
        });

        it('should sort posts by title ascending', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const posts: BlogPost[] = [
                {
                    slug: 'c',
                    title: 'Charlie',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: true,
                },
                {
                    slug: 'a',
                    title: 'Alpha',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: true,
                },
                {
                    slug: 'b',
                    title: 'Bravo',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: true,
                },
            ];

            for (const post of posts) {
                await client.writePost(post.slug, post);
            }

            const sortedPosts = await client.listPosts({ sortBy: 'title', sortOrder: 'asc' });
            expect(sortedPosts[0].title).toBe('Alpha');
            expect(sortedPosts[1].title).toBe('Bravo');
            expect(sortedPosts[2].title).toBe('Charlie');
        });

        it('should paginate posts', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            // Create 10 posts
            for (let i = 1; i <= 10; i++) {
                const post: BlogPost = {
                    slug: `post-${i}`,
                    title: `Post ${i}`,
                    content: 'Content',
                    createdAt: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
                    updatedAt: new Date(),
                    published: true,
                };
                await client.writePost(post.slug, post);
            }

            const page1 = await client.listPosts({ limit: 3, offset: 0 });
            expect(page1).toHaveLength(3);

            const page2 = await client.listPosts({ limit: 3, offset: 3 });
            expect(page2).toHaveLength(3);
            expect(page2[0].slug).not.toBe(page1[0].slug);
        });

        it('should check if post exists', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            expect(await client.postExists('test')).toBe(false);

            const post: BlogPost = {
                slug: 'test',
                title: 'Test',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await client.writePost('test', post);
            expect(await client.postExists('test')).toBe(true);
        });

        it('should handle posts with minimal frontmatter', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'minimal',
                title: 'Minimal Post',
                content: 'Just content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await client.writePost('minimal', post);
            const readPost = await client.readPost('minimal');

            expect(readPost.title).toBe('Minimal Post');
            expect(readPost.content).toBe('Just content');
            expect(readPost.tags).toEqual([]);
        });

        it('should preserve additional frontmatter fields', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'custom',
                title: 'Custom Fields',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: true,
                customField: 'custom value',
                anotherField: 123,
            };

            await client.writePost('custom', post);
            const readPost = await client.readPost('custom');

            expect(readPost.customField).toBe('custom value');
            expect(readPost.anotherField).toBe(123);
        });

        it('should throw InvalidPostError for malformed frontmatter', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            // Write a file with invalid frontmatter directly
            const filePath = path.join(tempDir, 'invalid.md');
            await fs.writeFile(filePath, '---\n# Invalid YAML\ntitle: [unclosed\n---\nContent');

            await expect(client.readPost('invalid')).rejects.toThrow(InvalidPostError);
        });

        it('should throw InvalidPostError for missing title', async () => {
            const config: StorageConfig = {
                provider: 'local',
                basePath: tempDir,
            };

            const client = createStorageClient(config);

            // Write a file without title
            const filePath = path.join(tempDir, 'no-title.md');
            await fs.writeFile(filePath, '---\npublished: true\n---\nContent');

            await expect(client.readPost('no-title')).rejects.toThrow(InvalidPostError);
        });
    });

    // ============================================================================
    // S3 Storage Provider Tests
    // ============================================================================

    describe('S3 Storage Provider', () => {
        it('should throw error for unimplemented S3 operations', async () => {
            const config: StorageConfig = {
                provider: 's3',
                bucket: 'test-bucket',
                region: 'us-east-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
            };

            const client = createStorageClient(config);

            const post: BlogPost = {
                slug: 'test',
                title: 'Test',
                content: 'Content',
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
            };

            await expect(client.writePost('test', post)).rejects.toThrow('S3 storage not yet implemented');
            await expect(client.readPost('test')).rejects.toThrow('S3 storage not yet implemented');
            await expect(client.deletePost('test')).rejects.toThrow('S3 storage not yet implemented');
            await expect(client.listPosts()).rejects.toThrow('S3 storage not yet implemented');
            await expect(client.postExists('test')).rejects.toThrow('S3 storage not yet implemented');
        });

        it('should throw error if S3 config is incomplete', () => {
            const config: StorageConfig = {
                provider: 's3',
                bucket: 'test-bucket',
                // Missing region, accessKeyId, secretAccessKey
            };

            expect(() => createStorageClient(config)).toThrow(
                'S3 storage requires bucket, region, accessKeyId, and secretAccessKey'
            );
        });
    });

    // ============================================================================
    // Factory Function Tests
    // ============================================================================

    describe('Factory Functions', () => {
        it('should create client from environment variables', () => {
            process.env.STORAGE_PROVIDER = 'local';
            process.env.CONTENT_PATH = tempDir;

            const client = createStorageClientFromEnv();

            expect(client).toBeInstanceOf(StorageClient);
            expect(client.getProvider()).toBe('local');
        });

        it('should default to local storage if provider not specified', () => {
            delete process.env.STORAGE_PROVIDER;
            process.env.CONTENT_PATH = tempDir;

            const client = createStorageClientFromEnv();

            expect(client.getProvider()).toBe('local');
        });

        it('should default to "content" directory if path not specified', () => {
            delete process.env.STORAGE_PROVIDER;
            delete process.env.CONTENT_PATH;

            const client = createStorageClientFromEnv();

            expect(client.getProvider()).toBe('local');
        });

        it('should throw on unsupported provider', () => {
            const config: StorageConfig = {
                provider: 'unsupported' as any,
            };

            expect(() => createStorageClient(config)).toThrow('Unsupported storage provider: unsupported');
        });
    });

    // ============================================================================
    // Utility Function Tests
    // ============================================================================

    describe('Utility Functions', () => {
        describe('generateSlug', () => {
            it('should convert title to lowercase slug', () => {
                expect(generateSlug('Hello World')).toBe('hello-world');
            });

            it('should replace spaces with hyphens', () => {
                expect(generateSlug('This is a test')).toBe('this-is-a-test');
            });

            it('should remove special characters', () => {
                expect(generateSlug('Hello, World!')).toBe('hello-world');
                expect(generateSlug('Test@#$%Post')).toBe('test-post');
            });

            it('should handle multiple consecutive spaces', () => {
                expect(generateSlug('Hello    World')).toBe('hello-world');
            });

            it('should trim leading and trailing hyphens', () => {
                expect(generateSlug('  Hello World  ')).toBe('hello-world');
                expect(generateSlug('---Test---')).toBe('test');
            });

            it('should handle numbers', () => {
                expect(generateSlug('Post 123')).toBe('post-123');
            });

            it('should handle already slugified strings', () => {
                expect(generateSlug('already-a-slug')).toBe('already-a-slug');
            });
        });

        describe('validatePost', () => {
            it('should return true for valid post', () => {
                const post: BlogPost = {
                    slug: 'test',
                    title: 'Test',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                };

                expect(validatePost(post)).toBe(true);
            });

            it('should return false for missing slug', () => {
                const post = {
                    title: 'Test',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                } as any;

                expect(validatePost(post)).toBe(false);
            });

            it('should return false for missing title', () => {
                const post = {
                    slug: 'test',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                } as any;

                expect(validatePost(post)).toBe(false);
            });

            it('should return false for missing content', () => {
                const post = {
                    slug: 'test',
                    title: 'Test',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                } as any;

                expect(validatePost(post)).toBe(false);
            });

            it('should return false for invalid dates', () => {
                const post = {
                    slug: 'test',
                    title: 'Test',
                    content: 'Content',
                    createdAt: 'not a date',
                    updatedAt: new Date(),
                    published: false,
                } as any;

                expect(validatePost(post)).toBe(false);
            });

            it('should return false for missing published field', () => {
                const post = {
                    slug: 'test',
                    title: 'Test',
                    content: 'Content',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any;

                expect(validatePost(post)).toBe(false);
            });

            it('should accept empty string content', () => {
                const post: BlogPost = {
                    slug: 'test',
                    title: 'Test',
                    content: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    published: false,
                };

                expect(validatePost(post)).toBe(true);
            });
        });
    });
});
