"""
LinkedIn Profile Scraper

A production-grade scraper for extracting profile data from LinkedIn URLs.
Supports both Selenium and Playwright for browser automation, with rate limiting,
user-agent rotation, and respectful scraping practices.
"""

__version__ = "1.0.0"
__author__ = "Aeroleads Team"

# Core components will be imported here as they are implemented
from .config import ScraperConfig, BrowserConfig, RateLimitConfig, ProxyConfig, AuthConfig, OutputConfig
from .fetch_profile import ProfileFetcher, SeleniumFetcher, PlaywrightFetcher, FetchResult, RateLimiter
from .login import LoginManager, SeleniumLoginHandler, PlaywrightLoginHandler, LoginResult, SessionManager
from .parse_profile import ProfileParser, ProfileData, Experience, parse_profile
from .exporters import CSVExporter, JSONExporter, ExportError, DataValidator, export_profiles

__all__ = [
    "__version__",
    "__author__",
    "ScraperConfig",
    "BrowserConfig",
    "RateLimitConfig",
    "ProxyConfig",
    "AuthConfig",
    "OutputConfig",
    "ProfileFetcher",
    "SeleniumFetcher",
    "PlaywrightFetcher",
    "FetchResult",
    "RateLimiter",
    "LoginManager",
    "SeleniumLoginHandler",
    "PlaywrightLoginHandler",
    "LoginResult",
    "SessionManager",
    "ProfileParser",
    "ProfileData",
    "Experience",
    "parse_profile",
    "CSVExporter",
    "JSONExporter",
    "ExportError",
    "DataValidator",
    "export_profiles",
]
