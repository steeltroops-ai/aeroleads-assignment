.PHONY: help doctor bootstrap scrape autodialer blog test clean docker-up docker-down docker-logs docker-clean

help:
	@echo "Aeroleads Assignment - Monorepo Commands"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make doctor      - Check if all required dependencies are installed"
	@echo "  make bootstrap   - Install all dependencies for all applications"
	@echo ""
	@echo "Application Commands:"
	@echo "  make scrape      - Run LinkedIn scraper"
	@echo "  make autodialer  - Start Rails autodialer server"
	@echo "  make blog        - Start Next.js blog generator"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-up   - Start all Docker services"
	@echo "  make docker-down - Stop all Docker services"
	@echo "  make docker-logs - View Docker service logs"
	@echo "  make docker-clean - Remove all Docker containers and volumes"
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test        - Run all test suites"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean       - Clean build artifacts and caches"

doctor:
	@echo "Checking development environment..."
ifeq ($(OS),Windows_NT)
	@scripts\dev_check.bat
else
	@bash scripts/dev_check.sh
endif

bootstrap:
	@echo "Installing all dependencies..."
ifeq ($(OS),Windows_NT)
	@scripts\bootstrap.bat
else
	@bash scripts/bootstrap.sh
endif

scrape:
	@echo "Running LinkedIn scraper..."
ifeq ($(OS),Windows_NT)
	@cd linkedin_scraper & python -m scraper.runner --input input_urls.txt --out profiles.csv --dry-run
else
	@cd linkedin_scraper && python -m scraper.runner --input input_urls.txt --out profiles.csv --dry-run
endif

autodialer:
	@echo "Starting Rails autodialer server..."
ifeq ($(OS),Windows_NT)
	@cd autodialer & bundle exec rails server
else
	@cd autodialer && bundle exec rails server
endif

blog:
	@echo "Starting Next.js blog generator..."
ifeq ($(OS),Windows_NT)
	@cd ai_blog_generator & npm run dev
else
	@cd ai_blog_generator && npm run dev
endif

test:
	@echo "Running all test suites..."
	@echo ""
	@echo "=== Testing LinkedIn Scraper ==="
ifeq ($(OS),Windows_NT)
	@cd linkedin_scraper & pytest tests/ -v
else
	@cd linkedin_scraper && pytest tests/ -v
endif
	@echo ""
	@echo "=== Testing Autodialer ==="
ifeq ($(OS),Windows_NT)
	@cd autodialer & bundle exec rspec
else
	@cd autodialer && bundle exec rspec
endif
	@echo ""
	@echo "=== Testing Blog Generator ==="
ifeq ($(OS),Windows_NT)
	@cd ai_blog_generator & npm test
else
	@cd ai_blog_generator && npm test
endif

clean:
	@echo "Cleaning build artifacts..."
ifeq ($(OS),Windows_NT)
	@if exist linkedin_scraper\__pycache__ rmdir /s /q linkedin_scraper\__pycache__ 2>nul
	@if exist linkedin_scraper\.pytest_cache rmdir /s /q linkedin_scraper\.pytest_cache 2>nul
	@if exist linkedin_scraper\profiles.csv del /q linkedin_scraper\profiles.csv 2>nul
	@if exist linkedin_scraper\profiles.json del /q linkedin_scraper\profiles.json 2>nul
	@if exist autodialer\tmp\cache rmdir /s /q autodialer\tmp\cache 2>nul
	@if exist autodialer\log rmdir /s /q autodialer\log 2>nul
	@if exist ai_blog_generator\.next rmdir /s /q ai_blog_generator\.next 2>nul
	@if exist ai_blog_generator\out rmdir /s /q ai_blog_generator\out 2>nul
	@if exist ai_blog_generator\node_modules rmdir /s /q ai_blog_generator\node_modules 2>nul
else
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@cd linkedin_scraper && rm -f profiles.csv profiles.json 2>/dev/null || true
	@cd autodialer && rm -rf tmp/cache log/*.log 2>/dev/null || true
	@cd ai_blog_generator && rm -rf .next out 2>/dev/null || true
endif
	@echo "Clean complete!"

docker-up:
	@echo "Starting Docker services..."
	@docker-compose up -d postgres redis
	@echo ""
	@echo "Infrastructure services started!"
	@echo "To start applications:"
	@echo "  docker-compose --profile autodialer up -d  (Rails autodialer)"
	@echo "  docker-compose --profile blog up -d         (Next.js blog)"
	@echo "  docker-compose --profile scraper up scraper (Python scraper)"

docker-down:
	@echo "Stopping Docker services..."
	@docker-compose down
	@echo "Docker services stopped!"

docker-logs:
	@docker-compose logs -f

docker-clean:
	@echo "Removing all Docker containers and volumes..."
	@docker-compose down -v
	@echo "Docker cleanup complete!"
