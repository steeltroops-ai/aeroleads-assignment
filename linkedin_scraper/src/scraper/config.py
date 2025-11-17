"""
Configuration management for LinkedIn scraper.

Handles environment variable loading, validation, and configuration dataclasses
for browser settings, rate limiting, proxy configuration, and authentication.
"""

import os
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv


@dataclass
class BrowserConfig:
    """Browser automation configuration."""
    
    headless: bool = True
    user_agent: Optional[str] = None
    window_width: int = 1920
    window_height: int = 1080
    page_load_timeout: int = 30
    implicit_wait: int = 10
    
    def __post_init__(self):
        """Validate browser configuration."""
        if self.window_width <= 0 or self.window_height <= 0:
            raise ValueError("Window dimensions must be positive integers")
        if self.page_load_timeout <= 0 or self.implicit_wait <= 0:
            raise ValueError("Timeout values must be positive integers")


@dataclass
class RateLimitConfig:
    """Rate limiting configuration for respectful scraping."""
    
    request_delay: float = 2.0  # Seconds between requests
    max_retries: int = 3
    retry_backoff_factor: float = 2.0  # Exponential backoff multiplier
    retry_jitter: float = 0.5  # Random jitter factor (0-1)
    max_retry_delay: float = 60.0  # Maximum delay between retries
    
    def __post_init__(self):
        """Validate rate limiting configuration."""
        if self.request_delay < 0:
            raise ValueError("Request delay must be non-negative")
        if self.max_retries < 0:
            raise ValueError("Max retries must be non-negative")
        if self.retry_backoff_factor < 1.0:
            raise ValueError("Retry backoff factor must be >= 1.0")
        if not 0 <= self.retry_jitter <= 1.0:
            raise ValueError("Retry jitter must be between 0 and 1")
        if self.max_retry_delay <= 0:
            raise ValueError("Max retry delay must be positive")


@dataclass
class ProxyConfig:
    """Proxy configuration for scraping."""
    
    enabled: bool = False
    url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    
    def __post_init__(self):
        """Validate proxy configuration."""
        if self.enabled and not self.url:
            raise ValueError("Proxy URL is required when proxy is enabled")
        
        # Validate proxy URL format if provided
        if self.url:
            if not (self.url.startswith('http://') or 
                   self.url.startswith('https://') or 
                   self.url.startswith('socks5://')):
                raise ValueError(
                    "Proxy URL must start with http://, https://, or socks5://"
                )
    
    def get_proxy_dict(self) -> Optional[dict]:
        """Get proxy configuration as dictionary for requests/selenium."""
        if not self.enabled or not self.url:
            return None
        
        if self.username and self.password:
            # Insert credentials into URL
            protocol, rest = self.url.split('://', 1)
            proxy_url = f"{protocol}://{self.username}:{self.password}@{rest}"
        else:
            proxy_url = self.url
        
        return {
            'http': proxy_url,
            'https': proxy_url,
        }


@dataclass
class AuthConfig:
    """Authentication configuration for LinkedIn login."""
    
    enabled: bool = False
    email: Optional[str] = None
    password: Optional[str] = None
    
    def __post_init__(self):
        """Validate authentication configuration."""
        if self.enabled:
            if not self.email or not self.password:
                raise ValueError(
                    "Email and password are required when authentication is enabled"
                )
            if '@' not in self.email:
                raise ValueError("Invalid email format")


@dataclass
class OutputConfig:
    """Output configuration for scraped data."""
    
    format: str = 'csv'  # csv or json
    output_dir: Path = field(default_factory=lambda: Path('./output'))
    filename_prefix: str = 'linkedin_profiles'
    
    def __post_init__(self):
        """Validate output configuration."""
        if self.format not in ('csv', 'json'):
            raise ValueError("Output format must be 'csv' or 'json'")
        
        # Convert string to Path if needed
        if isinstance(self.output_dir, str):
            self.output_dir = Path(self.output_dir)
        
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)


@dataclass
class ScraperConfig:
    """Main configuration class for the LinkedIn scraper."""
    
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    proxy: ProxyConfig = field(default_factory=ProxyConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    output: OutputConfig = field(default_factory=OutputConfig)
    use_playwright: bool = False
    dry_run: bool = False
    
    @classmethod
    def from_env(cls, env_file: Optional[str] = None) -> 'ScraperConfig':
        """
        Load configuration from environment variables.
        
        Args:
            env_file: Path to .env file. If None, looks for .env in current directory.
        
        Returns:
            ScraperConfig instance populated from environment variables.
        """
        # Load environment variables from .env file
        if env_file:
            load_dotenv(env_file)
        else:
            load_dotenv()
        
        # Browser configuration
        browser = BrowserConfig(
            headless=_get_bool_env('HEADLESS', True),
            user_agent=os.getenv('USER_AGENT'),
            window_width=_get_int_env('WINDOW_WIDTH', 1920),
            window_height=_get_int_env('WINDOW_HEIGHT', 1080),
            page_load_timeout=_get_int_env('PAGE_LOAD_TIMEOUT', 30),
            implicit_wait=_get_int_env('IMPLICIT_WAIT', 10),
        )
        
        # Rate limiting configuration
        rate_limit = RateLimitConfig(
            request_delay=_get_float_env('REQUEST_DELAY', 2.0),
            max_retries=_get_int_env('MAX_RETRIES', 3),
            retry_backoff_factor=_get_float_env('RETRY_BACKOFF_FACTOR', 2.0),
            retry_jitter=_get_float_env('RETRY_JITTER', 0.5),
            max_retry_delay=_get_float_env('MAX_RETRY_DELAY', 60.0),
        )
        
        # Proxy configuration
        proxy_url = os.getenv('PROXY_URL')
        proxy = ProxyConfig(
            enabled=bool(proxy_url),
            url=proxy_url,
            username=os.getenv('PROXY_USERNAME'),
            password=os.getenv('PROXY_PASSWORD'),
        )
        
        # Authentication configuration
        login_email = os.getenv('LOGIN_EMAIL')
        login_password = os.getenv('LOGIN_PASSWORD')
        auth = AuthConfig(
            enabled=bool(login_email and login_password),
            email=login_email,
            password=login_password,
        )
        
        # Output configuration
        output = OutputConfig(
            format=os.getenv('OUTPUT_FORMAT', 'csv').lower(),
            output_dir=Path(os.getenv('OUTPUT_DIR', './output')),
            filename_prefix=os.getenv('FILENAME_PREFIX', 'linkedin_profiles'),
        )
        
        # Other settings
        use_playwright = _get_bool_env('USE_PLAYWRIGHT', False)
        dry_run = _get_bool_env('DRY_RUN', False)
        
        return cls(
            browser=browser,
            rate_limit=rate_limit,
            proxy=proxy,
            auth=auth,
            output=output,
            use_playwright=use_playwright,
            dry_run=dry_run,
        )
    
    def validate(self) -> None:
        """
        Validate the entire configuration.
        
        Raises:
            ValueError: If any configuration is invalid.
        """
        # Validation is handled in __post_init__ of each dataclass
        # This method can be extended for cross-field validation
        pass


# Helper functions for environment variable parsing

def _get_bool_env(key: str, default: bool = False) -> bool:
    """Parse boolean environment variable."""
    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')


def _get_int_env(key: str, default: int) -> int:
    """Parse integer environment variable."""
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        raise ValueError(f"Environment variable {key} must be an integer, got: {value}")


def _get_float_env(key: str, default: float) -> float:
    """Parse float environment variable."""
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        raise ValueError(f"Environment variable {key} must be a float, got: {value}")
