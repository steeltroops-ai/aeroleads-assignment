# Autodialer System

Rails application for automated calling campaigns via Twilio with AI-powered prompts.

## Quick Start

```bash
# Install dependencies
bundle install

# Setup database
rails db:create db:migrate

# Configure
cp .env.example .env
# Add your Twilio credentials

# Start server
rails server
```

**Access:** http://localhost:3000

## Features

- CSV upload for phone numbers
- AI-powered natural language call requests
- Call logging (status, duration, cost)
- Real-time dashboard with analytics
- Background job processing with Sidekiq
- Safety features (toll-free only in dev)

## Configuration (.env)

```env
# Twilio (required)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=+18001234567

# Database
DATABASE_URL=postgresql://localhost/autodialer_development

# Redis (for background jobs)
REDIS_URL=redis://localhost:6379/0

# Optional: OpenAI for AI prompts
OPENAI_API_KEY=your_key

# Safety (dev mode)
ALLOW_REAL_CALLS=false  # Only toll-free numbers allowed
```

## Usage

### Web Interface

1. **Upload Contacts:** Upload CSV with phone numbers
2. **Create Campaign:** Use AI prompt or manual setup
3. **Monitor Calls:** View real-time dashboard
4. **View Reports:** Analytics and cost tracking

### CSV Format
```csv
phone_number,name,email
+18001234567,John Doe,john@example.com
+18881234567,Jane Smith,jane@example.com
```

### AI Prompts
Natural language examples:
- "Call all contacts and ask if they're interested in our product"
- "Survey customers about their satisfaction level"
- "Remind contacts about upcoming appointment"

### Background Jobs

```bash
# Start Sidekiq worker
bundle exec sidekiq

# Or use Procfile
foreman start
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
```

### Call Status
```bash
curl http://localhost:3000/api/calls/status
curl http://localhost:3000/api/calls/stats
```

## Testing

```bash
# Run all tests
bundle exec rspec

# Run specific test
bundle exec rspec spec/models/call_spec.rb

# With coverage
COVERAGE=true bundle exec rspec
```

## Diagnostics

```bash
# Full system check
rails diagnostics:full

# Check specific components
rails diagnostics:database
rails diagnostics:twilio
rails diagnostics:errors
```

## Safety Features

**Development Mode:**
- Only toll-free numbers allowed (800, 888, 877, 866, 855, 844, 833)
- Set `ALLOW_REAL_CALLS=true` to override (use with caution)

**Production Mode:**
- All numbers allowed
- Rate limiting enforced
- Cost tracking enabled

## Deployment

### Fly.io
```bash
fly launch
fly deploy
```

### Heroku
```bash
heroku create
git push heroku main
heroku run rails db:migrate
```

### Docker
```bash
docker-compose --profile autodialer up -d
```

## Troubleshooting

**Twilio errors:**
- Verify credentials in .env
- Check account balance
- Ensure phone number is verified

**Database errors:**
- Run `rails db:migrate`
- Check DATABASE_URL

**Job processing:**
- Ensure Redis is running
- Start Sidekiq worker

