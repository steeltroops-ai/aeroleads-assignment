"""
Profile fetching engine for LinkedIn scraper.

Handles web scraping with Selenium or Playwright, including:
- WebDriver setup and configuration
- User-agent rotation and request headers management
- Rate limiting with exponential backoff and jitter
- Proxy support and IP rotation
- Error handling and retry logic
"""

import time
import random
import logging
from typing import Optional, List
from dataclasses import dataclass

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    WebDriverException,
    NoSuchElementException
)

try:
    from playwright.sync_api import sync_playwright, Browser, Page, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    sync_playwright = None
    Browser = None
    Page = None
    PlaywrightTimeout = None

from .config import ScraperConfig


logger = logging.getLogger(__name__)


# Common user agents for rotation
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]


@dataclass
class FetchResult:
    """Result of a profile fetch operation."""
    
    url: str
    html: Optional[str] = None
    success: bool = False
    error: Optional[str] = None
    error_type: Optional[str] = None  # 'timeout', 'blocked', 'network', 'parse'
    status_code: Optional[int] = None
    retry_count: int = 0
    is_blocked: bool = False  # Indicates if access was blocked by LinkedIn


class RateLimiter:
    """Rate limiter with exponential backoff and jitter."""
    
    def __init__(self, config: ScraperConfig):
        self.config = config
        self.last_request_time = 0.0
    
    def wait(self) -> None:
        """Wait according to rate limit configuration."""
        elapsed = time.time() - self.last_request_time
        delay = self.config.rate_limit.request_delay
        
        if elapsed < delay:
            sleep_time = delay - elapsed
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def backoff(self, retry_count: int) -> float:
        """
        Calculate backoff delay with exponential backoff and jitter.
        
        Args:
            retry_count: Number of retries attempted
        
        Returns:
            Delay in seconds
        """
        base_delay = self.config.rate_limit.request_delay
        backoff_factor = self.config.rate_limit.retry_backoff_factor
        jitter_factor = self.config.rate_limit.retry_jitter
        max_delay = self.config.rate_limit.max_retry_delay
        
        # Exponential backoff: delay * (backoff_factor ^ retry_count)
        delay = base_delay * (backoff_factor ** retry_count)
        
        # Add random jitter: delay * (1 ± jitter_factor)
        jitter = delay * jitter_factor * (2 * random.random() - 1)
        delay = delay + jitter
        
        # Cap at maximum delay
        delay = min(delay, max_delay)
        
        logger.debug(f"Backoff delay for retry {retry_count}: {delay:.2f}s")
        return delay


class SeleniumFetcher:
    """Profile fetcher using Selenium WebDriver."""
    
    def __init__(self, config: ScraperConfig):
        self.config = config
        self.driver: Optional[webdriver.Chrome] = None
        self.rate_limiter = RateLimiter(config)
        self.user_agents = USER_AGENTS.copy()
        random.shuffle(self.user_agents)
        self.current_ua_index = 0
    
    def _get_next_user_agent(self) -> str:
        """Get next user agent from rotation pool."""
        if self.config.browser.user_agent:
            return self.config.browser.user_agent
        
        ua = self.user_agents[self.current_ua_index]
        self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        return ua
    
    def _create_driver(self) -> webdriver.Chrome:
        """Create and configure Chrome WebDriver."""
        options = ChromeOptions()
        
        # Headless mode
        if self.config.browser.headless:
            options.add_argument('--headless=new')
        
        # User agent
        user_agent = self._get_next_user_agent()
        options.add_argument(f'user-agent={user_agent}')
        logger.debug(f"Using user agent: {user_agent}")
        
        # Window size
        options.add_argument(
            f'--window-size={self.config.browser.window_width},'
            f'{self.config.browser.window_height}'
        )
        
        # Additional options for stability
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Proxy configuration
        if self.config.proxy.enabled and self.config.proxy.url:
            proxy_url = self.config.proxy.url
            if self.config.proxy.username and self.config.proxy.password:
                # Note: Chrome doesn't support authenticated proxies directly
                # This would require a proxy extension or other workaround
                logger.warning(
                    "Authenticated proxies require additional setup with Chrome. "
                    "Consider using Playwright instead."
                )
            options.add_argument(f'--proxy-server={proxy_url}')
            logger.debug(f"Using proxy: {proxy_url}")
        
        # Create driver
        driver = webdriver.Chrome(options=options)
        
        # Set timeouts
        driver.set_page_load_timeout(self.config.browser.page_load_timeout)
        driver.implicitly_wait(self.config.browser.implicit_wait)
        
        return driver
    
    def start(self) -> None:
        """Start the WebDriver."""
        if self.driver is None:
            logger.info("Starting Selenium WebDriver")
            self.driver = self._create_driver()
    
    def stop(self) -> None:
        """Stop the WebDriver."""
        if self.driver:
            logger.info("Stopping Selenium WebDriver")
            self.driver.quit()
            self.driver = None
    
    def fetch(self, url: str) -> FetchResult:
        """
        Fetch a LinkedIn profile page.
        
        Args:
            url: LinkedIn profile URL
        
        Returns:
            FetchResult with HTML content or error
        """
        if not self.driver:
            self.start()
        
        max_retries = self.config.rate_limit.max_retries
        
        for retry in range(max_retries + 1):
            try:
                # Rate limiting
                if retry == 0:
                    self.rate_limiter.wait()
                else:
                    # Exponential backoff for retries
                    backoff_delay = self.rate_limiter.backoff(retry)
                    logger.info(f"Retry {retry}/{max_retries} after {backoff_delay:.2f}s")
                    time.sleep(backoff_delay)
                
                # Fetch page
                logger.info(f"Fetching: {url}")
                self.driver.get(url)
                
                # Wait for page to load (basic check)
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                
                # Get page source
                html = self.driver.page_source
                
                # Check if we got blocked or redirected to login
                if self._is_blocked(html):
                    logger.warning("Detected blocking or login requirement")
                    if retry < max_retries:
                        continue
                    return FetchResult(
                        url=url,
                        success=False,
                        error="Access blocked or login required",
                        error_type="blocked",
                        is_blocked=True,
                        retry_count=retry
                    )
                
                logger.info(f"Successfully fetched: {url}")
                return FetchResult(
                    url=url,
                    html=html,
                    success=True,
                    retry_count=retry
                )
            
            except TimeoutException as e:
                logger.warning(f"Timeout fetching {url}: {e}")
                if retry >= max_retries:
                    return FetchResult(
                        url=url,
                        success=False,
                        error=f"Timeout after {max_retries} retries",
                        error_type="timeout",
                        retry_count=retry
                    )
            
            except WebDriverException as e:
                logger.error(f"WebDriver error fetching {url}: {e}")
                if retry >= max_retries:
                    return FetchResult(
                        url=url,
                        success=False,
                        error=f"WebDriver error: {str(e)}",
                        error_type="network",
                        retry_count=retry
                    )
            
            except Exception as e:
                logger.error(f"Unexpected error fetching {url}: {e}")
                return FetchResult(
                    url=url,
                    success=False,
                    error=f"Unexpected error: {str(e)}",
                    error_type="network",
                    retry_count=retry
                )
        
        return FetchResult(
            url=url,
            success=False,
            error="Max retries exceeded",
            error_type="network",
            retry_count=max_retries
        )
    
    def _is_blocked(self, html: str) -> bool:
        """Check if the page indicates blocking or login requirement."""
        # Check for JSON-LD data first - if present, we have access to public profile
        if 'application/ld+json' in html and '"@type":"Person"' in html:
            return False
        
        # Only block if we see strong indicators AND no structured data
        blocked_indicators = [
            'authwall-join',
            'public_profile_contextual-sign-in',
            'Join to view',
        ]
        
        html_lower = html.lower()
        return any(indicator.lower() in html_lower for indicator in blocked_indicators)
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()


class PlaywrightFetcher:
    """Profile fetcher using Playwright."""
    
    def __init__(self, config: ScraperConfig):
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError(
                "Playwright is not installed. "
                "Install it with: pip install playwright && playwright install chromium"
            )
        
        self.config = config
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context = None
        self.rate_limiter = RateLimiter(config)
        self.user_agents = USER_AGENTS.copy()
        random.shuffle(self.user_agents)
        self.current_ua_index = 0
    
    def _get_next_user_agent(self) -> str:
        """Get next user agent from rotation pool."""
        if self.config.browser.user_agent:
            return self.config.browser.user_agent
        
        ua = self.user_agents[self.current_ua_index]
        self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        return ua
    
    def start(self) -> None:
        """Start Playwright browser."""
        if self.browser is None:
            logger.info("Starting Playwright browser")
            self.playwright = sync_playwright().start()
            
            # Browser launch options
            launch_options = {
                'headless': self.config.browser.headless,
            }
            
            # Proxy configuration
            if self.config.proxy.enabled and self.config.proxy.url:
                proxy_config = {'server': self.config.proxy.url}
                if self.config.proxy.username and self.config.proxy.password:
                    proxy_config['username'] = self.config.proxy.username
                    proxy_config['password'] = self.config.proxy.password
                launch_options['proxy'] = proxy_config
                logger.debug(f"Using proxy: {self.config.proxy.url}")
            
            self.browser = self.playwright.chromium.launch(**launch_options)
            
            # Create context with user agent
            user_agent = self._get_next_user_agent()
            self.context = self.browser.new_context(
                user_agent=user_agent,
                viewport={
                    'width': self.config.browser.window_width,
                    'height': self.config.browser.window_height
                }
            )
            logger.debug(f"Using user agent: {user_agent}")
    
    def stop(self) -> None:
        """Stop Playwright browser."""
        if self.context:
            self.context.close()
            self.context = None
        
        if self.browser:
            logger.info("Stopping Playwright browser")
            self.browser.close()
            self.browser = None
        
        if self.playwright:
            self.playwright.stop()
            self.playwright = None
    
    def fetch(self, url: str) -> FetchResult:
        """
        Fetch a LinkedIn profile page.
        
        Args:
            url: LinkedIn profile URL
        
        Returns:
            FetchResult with HTML content or error
        """
        if not self.browser:
            self.start()
        
        max_retries = self.config.rate_limit.max_retries
        
        for retry in range(max_retries + 1):
            page = None
            try:
                # Rate limiting
                if retry == 0:
                    self.rate_limiter.wait()
                else:
                    # Exponential backoff for retries
                    backoff_delay = self.rate_limiter.backoff(retry)
                    logger.info(f"Retry {retry}/{max_retries} after {backoff_delay:.2f}s")
                    time.sleep(backoff_delay)
                
                # Create new page
                page = self.context.new_page()
                
                # Set timeout
                page.set_default_timeout(self.config.browser.page_load_timeout * 1000)
                
                # Fetch page
                logger.info(f"Fetching: {url}")
                response = page.goto(url, wait_until='domcontentloaded')
                
                # Get page content
                html = page.content()
                
                # Check status code
                status_code = response.status if response else None
                
                # Check if we got blocked or redirected to login
                if self._is_blocked(html):
                    logger.warning("Detected blocking or login requirement")
                    if retry < max_retries:
                        page.close()
                        continue
                    return FetchResult(
                        url=url,
                        success=False,
                        error="Access blocked or login required",
                        error_type="blocked",
                        is_blocked=True,
                        status_code=status_code,
                        retry_count=retry
                    )
                
                logger.info(f"Successfully fetched: {url} (status: {status_code})")
                page.close()
                return FetchResult(
                    url=url,
                    html=html,
                    success=True,
                    status_code=status_code,
                    retry_count=retry
                )
            
            except PlaywrightTimeout as e:
                logger.warning(f"Timeout fetching {url}: {e}")
                if page:
                    page.close()
                if retry >= max_retries:
                    return FetchResult(
                        url=url,
                        success=False,
                        error=f"Timeout after {max_retries} retries",
                        error_type="timeout",
                        retry_count=retry
                    )
            
            except Exception as e:
                logger.error(f"Error fetching {url}: {e}")
                if page:
                    page.close()
                if retry >= max_retries:
                    return FetchResult(
                        url=url,
                        success=False,
                        error=f"Error: {str(e)}",
                        error_type="network",
                        retry_count=retry
                    )
        
        return FetchResult(
            url=url,
            success=False,
            error="Max retries exceeded",
            error_type="network",
            retry_count=max_retries
        )
    
    def _is_blocked(self, html: str) -> bool:
        """Check if the page indicates blocking or login requirement."""
        # Check for JSON-LD data first - if present, we have access to public profile
        if 'application/ld+json' in html and '"@type":"Person"' in html:
            return False
        
        # Only block if we see strong indicators AND no structured data
        blocked_indicators = [
            'authwall-join',
            'public_profile_contextual-sign-in',
            'Join to view',
        ]
        
        html_lower = html.lower()
        return any(indicator.lower() in html_lower for indicator in blocked_indicators)
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()


class ProfileFetcher:
    """
    Main profile fetcher that delegates to Selenium or Playwright.
    
    This class provides a unified interface for fetching profiles
    regardless of the underlying browser automation tool.
    """
    
    def __init__(self, config: ScraperConfig):
        self.config = config
        
        if config.use_playwright:
            logger.info("Using Playwright for profile fetching")
            self.fetcher = PlaywrightFetcher(config)
        else:
            logger.info("Using Selenium for profile fetching")
            self.fetcher = SeleniumFetcher(config)
    
    def start(self) -> None:
        """Start the fetcher."""
        self.fetcher.start()
    
    def stop(self) -> None:
        """Stop the fetcher."""
        self.fetcher.stop()
    
    def fetch(self, url: str) -> FetchResult:
        """
        Fetch a LinkedIn profile page.
        
        Args:
            url: LinkedIn profile URL
        
        Returns:
            FetchResult with HTML content or error
        """
        return self.fetcher.fetch(url)
    
    def fetch_multiple(self, urls: List[str]) -> List[FetchResult]:
        """
        Fetch multiple LinkedIn profile pages.
        
        Args:
            urls: List of LinkedIn profile URLs
        
        Returns:
            List of FetchResult objects
        """
        results = []
        
        try:
            self.start()
            
            for i, url in enumerate(urls, 1):
                logger.info(f"Fetching profile {i}/{len(urls)}")
                result = self.fetch(url)
                results.append(result)
                
                if not result.success:
                    logger.error(f"Failed to fetch {url}: {result.error}")
        
        finally:
            self.stop()
        
        return results
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
