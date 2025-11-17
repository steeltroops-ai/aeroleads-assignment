# LinkedIn Profile Scraper

Professional web-based LinkedIn profile scraper with modern UI.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the web app
python web_app.py

# Open in browser
http://localhost:5000
```

## Features

- **Web Interface** - Clean, professional UI
- **Bulk Scraping** - Process multiple profiles at once
- **JSON-LD Extraction** - Reliable data extraction from public profiles
- **Optional Authentication** - Sign in for private profiles
- **Export Options** - Download as CSV or JSON
- **Stop Button** - Cancel scraping anytime
- **20+ Sample Profiles** - Pre-loaded public profiles for testing

## Usage

1. **Load Sample** - Click to load 20+ public profiles
2. **Start Scraping** - Begin extraction
3. **Stop** - Cancel anytime if needed
4. **Export** - Download results as CSV or JSON

## Authentication (Optional)

For private profiles or bulk scraping:
1. Enter LinkedIn email and password in sidebar
2. Click "Save Credentials"
3. Credentials used only for current session

## What Gets Extracted

- Full Name
- Professional Headline
- Location
- About/Bio
- Work Experience (Company, Title, Dates)
- Profile URL

## Requirements

- Python 3.8+
- Chrome/Chromium browser
- Dependencies in requirements.txt

## Configuration

Edit `.env` file:
```env
HEADLESS=true
REQUEST_DELAY=5
MAX_RETRIES=2
```

## Important Notes

- For educational purposes only
- Respects LinkedIn's rate limits
- Use test accounts for authentication
- Public profiles work without login

## Files Structure

```
linkedin_scraper/
├── web_app.py              # Flask web server
├── templates/
│   └── index.html          # Web interface
├── src/scraper/
│   ├── config.py           # Configuration
│   ├── fetch_profile.py    # Profile fetching
│   ├── parse_profile.py    # Data parsing
│   ├── login.py            # Authentication
│   └── exporters.py        # CSV/JSON export
├── requirements.txt        # Dependencies
└── .env                    # Configuration
```

## License

MIT
