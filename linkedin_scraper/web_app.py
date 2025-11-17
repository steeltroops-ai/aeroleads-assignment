"""
Simple Flask web interface for LinkedIn Profile Scraper.
Allows users to input URLs and see scraped results in the browser.
"""

from flask import Flask, render_template, request, jsonify, send_file
from pathlib import Path
import sys
import logging
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from scraper.config import ScraperConfig
from scraper.fetch_profile import ProfileFetcher
from scraper.parse_profile import ProfileParser
from scraper.exporters import export_profiles

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route('/')
def index():
    """Main page with input form."""
    return render_template('index.html')


@app.route('/scrape', methods=['POST'])
def scrape():
    """
    Scrape LinkedIn profiles from provided URLs.
    
    Expects JSON: {"urls": ["url1", "url2", ...], "use_auth": false}
    Returns JSON: {"success": true, "profiles": [...], "errors": [...]}
    """
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        auth_data = data.get('auth', None)
        
        if not urls:
            return jsonify({
                'success': False,
                'error': 'No URLs provided'
            }), 400
        
        # Clean and validate URLs
        urls = [url.strip() for url in urls if url.strip()]
        
        if not urls:
            return jsonify({
                'success': False,
                'error': 'No valid URLs provided'
            }), 400
        
        logger.info(f"Scraping {len(urls)} URLs...")
        
        # Load configuration
        config = ScraperConfig.from_env()
        config.browser.headless = True  # Always headless for web app
        
        # Apply auth credentials if provided
        if auth_data and 'email' in auth_data and 'password' in auth_data:
            config.auth.enabled = True
            config.auth.email = auth_data['email']
            config.auth.password = auth_data['password']
            logger.info("Using provided authentication credentials")
        
        # Initialize components
        fetcher = ProfileFetcher(config)
        parser = ProfileParser()
        
        # Handle login if auth is enabled
        login_manager = None
        if config.auth.enabled:
            from scraper.login import LoginManager
            login_manager = LoginManager(config)
        
        profiles = []
        errors = []
        
        try:
            fetcher.start()
            
            # Perform login if auth is enabled
            if config.auth.enabled and login_manager:
                logger.info("Attempting LinkedIn login...")
                try:
                    login_result = login_manager.login_selenium(
                        fetcher.fetcher.driver,
                        use_saved_session=True
                    )
                    if login_result.success:
                        logger.info("Successfully logged in to LinkedIn")
                    else:
                        logger.warning(f"Login failed: {login_result.error}")
                except Exception as e:
                    logger.warning(f"Login error: {e}")
            
            for i, url in enumerate(urls, 1):
                logger.info(f"Processing {i}/{len(urls)}: {url}")
                
                try:
                    # Fetch profile
                    fetch_result = fetcher.fetch(url)
                    
                    if not fetch_result.success:
                        errors.append({
                            'url': url,
                            'error': fetch_result.error,
                            'type': fetch_result.error_type
                        })
                        continue
                    
                    # Parse profile
                    profile = parser.parse_html(fetch_result.html, url=url)
                    
                    # Convert to dict for JSON response
                    profile_dict = profile.to_dict()
                    profiles.append(profile_dict)
                    
                except Exception as e:
                    logger.error(f"Error processing {url}: {e}")
                    errors.append({
                        'url': url,
                        'error': str(e),
                        'type': 'parse_error'
                    })
        
        finally:
            fetcher.stop()
        
        return jsonify({
            'success': True,
            'profiles': profiles,
            'errors': errors,
            'total_urls': len(urls),
            'successful': len(profiles),
            'failed': len(errors)
        })
    
    except Exception as e:
        logger.error(f"Scraping error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/export', methods=['POST'])
def export():
    """
    Export profiles to CSV or JSON.
    
    Expects JSON: {"profiles": [...], "format": "csv"}
    Returns: File download
    """
    try:
        data = request.get_json()
        profiles_data = data.get('profiles', [])
        format = data.get('format', 'csv').lower()
        
        if not profiles_data:
            return jsonify({
                'success': False,
                'error': 'No profiles to export'
            }), 400
        
        # Convert dict data back to ProfileData objects
        from scraper.parse_profile import ProfileData, Experience
        
        profiles = []
        for p_data in profiles_data:
            experiences = [
                Experience(**exp) for exp in p_data.get('experiences', [])
            ]
            
            profile = ProfileData(
                name=p_data['name'],
                headline=p_data.get('headline', ''),
                location=p_data.get('location', ''),
                about=p_data.get('about', ''),
                experiences=experiences,
                url=p_data.get('url', ''),
                scraped_at=datetime.fromisoformat(p_data['scraped_at'])
            )
            profiles.append(profile)
        
        # Export to file
        output_dir = Path('output')
        output_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"linkedin_profiles_{timestamp}.{format}"
        output_path = output_dir / filename
        
        export_profiles(profiles, output_path, format=format)
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        logger.error(f"Export error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'LinkedIn Scraper Web App',
        'version': '1.0.0'
    })


if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("LinkedIn Profile Scraper - Web Interface")
    print("=" * 70)
    print("\n🌐 Starting web server...")
    print("\n📍 Access the app at: http://localhost:5000")
    print("\n⚠️  Important Notes:")
    print("   - Make sure Chrome/Chromium is installed")
    print("   - Configure .env file with credentials if needed")
    print("   - Respect LinkedIn's Terms of Service")
    print("\n" + "=" * 70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
