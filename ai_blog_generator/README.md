# AI Blog Generator

Next.js application that generates blog posts from titles using LLM providers.

## Quick Start

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Add your LLM API key

# Start dev server
npm run dev
```

**Access:** http://localhost:3000

## Features

- Multiple LLM providers (OpenAI, Gemini, Perplexity)
- Markdown blog post generation
- Static site generation
- Search functionality
- Content management UI
- SEO optimization
- Social sharing

## Configuration (.env)

```env
# Choose provider: openai, gemini, or perplexity
LLM_PROVIDER=openai

# OpenAI (recommended)
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# OR Gemini (free tier)
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-1.5-flash

# OR Perplexity (with web search)
PERPLEXITY_API_KEY=your_key
PERPLEXITY_MODEL=llama-3.1-sonar-small-128k-online

# Blog settings
BLOG_BASE_URL=http://localhost:3000
STORAGE_PROVIDER=local
CONTENT_PATH=content
```

## Usage

### Generate Posts

**Via Web UI:**
1. Go to http://localhost:3000
2. Enter blog post titles
3. Select tone, length, tags
4. Click "Generate"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "titles": ["Getting Started with TypeScript"],
    "tone": "technical",
    "length": "medium",
    "tags": ["typescript", "tutorial"]
  }'
```

### Manage Content

**Management UI:** http://localhost:3000/manage
- View all posts
- Edit content
- Delete posts
- Publish/unpublish

### View Blog

**Blog:** http://localhost:3000/blog
- Browse all posts
- Search posts
- Read individual posts
- Share on social media

## API Endpoints

### Generate Posts
```
POST /api/generate
Body: { titles: string[], tone?, length?, tags? }
```

### Health Check
```
GET /api/health
GET /api/health?detailed=true
```

## Content Templates

Supports multiple article types:
- Tutorial/How-to
- Listicle
- Comparison
- Case Study
- Opinion/Editorial
- News/Update
- Review
- Interview

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
vercel deploy
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

### Docker
```bash
docker-compose --profile blog up -d
```

## Content Storage

**Local (default):**
- Posts stored in `content/` directory
- Markdown files with frontmatter

**S3 (optional):**
```env
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

## Troubleshooting

**LLM API errors:**
- Verify API key in .env
- Check provider status
- Review rate limits

**Build errors:**
- Clear `.next` folder
- Delete `node_modules` and reinstall
- Check Node.js version (18+)

**Content not showing:**
- Check `content/` directory exists
- Verify markdown frontmatter format
- Run `npm run build` to regenerate