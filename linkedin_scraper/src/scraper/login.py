"""
Authentication module for LinkedIn scraper.

Handles optional test account login with:
- Secure credential handling from environment variables
- Login flow with proper error handling
- Session management and cookie persistence
- Support for both Selenium and Playwright
"""

import time
import logging
import json
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException
)

try:
    from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    Page = None
    PlaywrightTimeout = None

from .config import ScraperConfig, AuthConfig


logger = logging.getLogger(__name__)


@dataclass
class LoginResult:
    """Result of a login attempt."""
    
    success: bool
    error: Optional[str] = None
    session_saved: bool = False


class SessionManager:
    """Manages session persistence through cookies."""
    
    def __init__(self, session_dir: Path = Path('./linkedin_scraper/.sessions')):
        """
        Initialize session manager.
        
        Args:
            session_dir: Directory to store session cookies
        """
        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)
    
    def get_session_file(self, email: str) -> Path:
        """
        Get session file path for a given email.
        
        Args:
            email: User email (used as identifier)
        
        Returns:
            Path to session file
        """
        # Use hash of email for privacy
        import hashlib
        email_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
        return self.session_dir / f"session_{email_hash}.json"
    
    def save_cookies(self, cookies: list, email: str) -> bool:
        """
        Save cookies to session file.
        
        Args:
            cookies: List of cookie dictionaries
            email: User email
        
        Returns:
            True if saved successfully
        """
        try:
            session_file = self.get_session_file(email)
            with open(session_file, 'w') as f:
                json.dump(cookies, f, indent=2)
            logger.info(f"Session saved to {session_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save session: {e}")
            return False
    
    def load_cookies(self, email: str) -> Optional[list]:
        """
        Load cookies from session file.
        
        Args:
            email: User email
        
        Returns:
            List of cookie dictionaries or None if not found
        """
        try:
            session_file = self.get_session_file(email)
            if not session_file.exists():
                logger.debug(f"No session file found for {email}")
                return None
            
            with open(session_file, 'r') as f:
                cookies = json.load(f)
            logger.info(f"Session loaded from {session_file}")
            return cookies
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return None
    
    def clear_session(self, email: str) -> bool:
        """
        Clear session file for a given email.
        
        Args:
            email: User email
        
        Returns:
            True if cleared successfully
        """
        try:
            session_file = self.get_session_file(email)
            if session_file.exists():
                session_file.unlink()
                logger.info(f"Session cleared for {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to clear session: {e}")
            return False


class SeleniumLoginHandler:
    """Handles LinkedIn login using Selenium WebDriver."""
    
    def __init__(self, driver: webdriver.Chrome, config: AuthConfig):
        """
        Initialize login handler.
        
        Args:
            driver: Selenium WebDriver instance
            config: Authentication configuration
        """
        self.driver = driver
        self.config = config
        self.session_manager = SessionManager()
    
    def login(self, use_saved_session: bool = True) -> LoginResult:
        """
        Perform LinkedIn login.
        
        Args:
            use_saved_session: Whether to try loading saved session first
        
        Returns:
            LoginResult indicating success or failure
        """
        if not self.config.enabled:
            logger.info("Authentication not enabled")
            return LoginResult(success=True)
        
        if not self.config.email or not self.config.password:
            return LoginResult(
                success=False,
                error="Email and password are required for authentication"
            )
        
        # Try to load saved session first
        if use_saved_session:
            if self._load_session():
                if self._verify_login():
                    logger.info("Successfully logged in using saved session")
                    return LoginResult(success=True, session_saved=False)
                else:
                    logger.info("Saved session expired, performing fresh login")
                    self.session_manager.clear_session(self.config.email)
        
        # Perform fresh login
        return self._perform_login()
    
    def _load_session(self) -> bool:
        """
        Load saved session cookies.
        
        Returns:
            True if session loaded successfully
        """
        cookies = self.session_manager.load_cookies(self.config.email)
        if not cookies:
            return False
        
        try:
            # Navigate to LinkedIn first
            self.driver.get('https://www.linkedin.com')
            time.sleep(2)
            
            # Add cookies
            for cookie in cookies:
                try:
                    # Remove problematic fields
                    cookie_clean = {
                        'name': cookie['name'],
                        'value': cookie['value'],
                        'domain': cookie.get('domain', '.linkedin.com'),
                    }
                    if 'path' in cookie:
                        cookie_clean['path'] = cookie['path']
                    if 'secure' in cookie:
                        cookie_clean['secure'] = cookie['secure']
                    
                    self.driver.add_cookie(cookie_clean)
                except Exception as e:
                    logger.debug(f"Failed to add cookie {cookie.get('name')}: {e}")
            
            logger.info("Session cookies loaded")
            return True
        
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return False
    
    def _verify_login(self) -> bool:
        """
        Verify if user is logged in.
        
        Returns:
            True if logged in
        """
        try:
            # Navigate to feed to check login status
            self.driver.get('https://www.linkedin.com/feed/')
            time.sleep(3)
            
            # Check for login indicators
            current_url = self.driver.current_url
            
            # If redirected to login page, not logged in
            if 'login' in current_url or 'authwall' in current_url:
                logger.debug("Not logged in - redirected to login page")
                return False
            
            # Check for navigation bar (indicates logged in)
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'nav.global-nav'))
                )
                logger.debug("Login verified - navigation bar found")
                return True
            except TimeoutException:
                logger.debug("Login verification failed - navigation bar not found")
                return False
        
        except Exception as e:
            logger.error(f"Error verifying login: {e}")
            return False
    
    def _perform_login(self) -> LoginResult:
        """
        Perform fresh login to LinkedIn.
        
        Returns:
            LoginResult indicating success or failure
        """
        try:
            logger.info(f"Logging in to LinkedIn as {self.config.email}")
            
            # Navigate to login page
            self.driver.get('https://www.linkedin.com/login')
            time.sleep(2)
            
            # Wait for login form
            try:
                email_field = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.ID, 'username'))
                )
            except TimeoutException:
                return LoginResult(
                    success=False,
                    error="Login form not found - page may have changed"
                )
            
            # Enter credentials
            email_field.clear()
            email_field.send_keys(self.config.email)
            
            password_field = self.driver.find_element(By.ID, 'password')
            password_field.clear()
            password_field.send_keys(self.config.password)
            
            # Submit form
            submit_button = self.driver.find_element(
                By.CSS_SELECTOR, 'button[type="submit"]'
            )
            submit_button.click()
            
            # Wait for navigation
            time.sleep(5)
            
            # Check if login was successful
            current_url = self.driver.current_url
            
            # Check for common error indicators
            if 'login' in current_url and 'checkpoint' not in current_url:
                # Still on login page - likely failed
                try:
                    error_element = self.driver.find_element(
                        By.CSS_SELECTOR, '.form__label--error'
                    )
                    error_text = error_element.text
                    return LoginResult(
                        success=False,
                        error=f"Login failed: {error_text}"
                    )
                except NoSuchElementException:
                    return LoginResult(
                        success=False,
                        error="Login failed - invalid credentials or unknown error"
                    )
            
            # Check for security checkpoint
            if 'checkpoint' in current_url:
                logger.warning(
                    "Security checkpoint detected. "
                    "Manual verification may be required."
                )
                return LoginResult(
                    success=False,
                    error="Security checkpoint - manual verification required"
                )
            
            # Verify login was successful
            if not self._verify_login():
                return LoginResult(
                    success=False,
                    error="Login verification failed"
                )
            
            # Save session cookies
            cookies = self.driver.get_cookies()
            session_saved = self.session_manager.save_cookies(
                cookies, 
                self.config.email
            )
            
            logger.info("Successfully logged in to LinkedIn")
            return LoginResult(success=True, session_saved=session_saved)
        
        except TimeoutException as e:
            return LoginResult(
                success=False,
                error=f"Timeout during login: {str(e)}"
            )
        
        except NoSuchElementException as e:
            return LoginResult(
                success=False,
                error=f"Login form element not found: {str(e)}"
            )
        
        except WebDriverException as e:
            return LoginResult(
                success=False,
                error=f"WebDriver error during login: {str(e)}"
            )
        
        except Exception as e:
            return LoginResult(
                success=False,
                error=f"Unexpected error during login: {str(e)}"
            )


class PlaywrightLoginHandler:
    """Handles LinkedIn login using Playwright."""
    
    def __init__(self, page: 'Page', config: AuthConfig):
        """
        Initialize login handler.
        
        Args:
            page: Playwright Page instance
            config: Authentication configuration
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError("Playwright is not available")
        
        self.page = page
        self.config = config
        self.session_manager = SessionManager()
    
    def login(self, use_saved_session: bool = True) -> LoginResult:
        """
        Perform LinkedIn login.
        
        Args:
            use_saved_session: Whether to try loading saved session first
        
        Returns:
            LoginResult indicating success or failure
        """
        if not self.config.enabled:
            logger.info("Authentication not enabled")
            return LoginResult(success=True)
        
        if not self.config.email or not self.config.password:
            return LoginResult(
                success=False,
                error="Email and password are required for authentication"
            )
        
        # Try to load saved session first
        if use_saved_session:
            if self._load_session():
                if self._verify_login():
                    logger.info("Successfully logged in using saved session")
                    return LoginResult(success=True, session_saved=False)
                else:
                    logger.info("Saved session expired, performing fresh login")
                    self.session_manager.clear_session(self.config.email)
        
        # Perform fresh login
        return self._perform_login()
    
    def _load_session(self) -> bool:
        """
        Load saved session cookies.
        
        Returns:
            True if session loaded successfully
        """
        cookies = self.session_manager.load_cookies(self.config.email)
        if not cookies:
            return False
        
        try:
            # Navigate to LinkedIn first
            self.page.goto('https://www.linkedin.com')
            time.sleep(2)
            
            # Add cookies to context
            context = self.page.context
            context.add_cookies(cookies)
            
            logger.info("Session cookies loaded")
            return True
        
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return False
    
    def _verify_login(self) -> bool:
        """
        Verify if user is logged in.
        
        Returns:
            True if logged in
        """
        try:
            # Navigate to feed to check login status
            self.page.goto('https://www.linkedin.com/feed/')
            time.sleep(3)
            
            # Check for login indicators
            current_url = self.page.url
            
            # If redirected to login page, not logged in
            if 'login' in current_url or 'authwall' in current_url:
                logger.debug("Not logged in - redirected to login page")
                return False
            
            # Check for navigation bar (indicates logged in)
            try:
                self.page.wait_for_selector('nav.global-nav', timeout=5000)
                logger.debug("Login verified - navigation bar found")
                return True
            except PlaywrightTimeout:
                logger.debug("Login verification failed - navigation bar not found")
                return False
        
        except Exception as e:
            logger.error(f"Error verifying login: {e}")
            return False
    
    def _perform_login(self) -> LoginResult:
        """
        Perform fresh login to LinkedIn.
        
        Returns:
            LoginResult indicating success or failure
        """
        try:
            logger.info(f"Logging in to LinkedIn as {self.config.email}")
            
            # Navigate to login page
            self.page.goto('https://www.linkedin.com/login')
            time.sleep(2)
            
            # Wait for login form
            try:
                self.page.wait_for_selector('#username', timeout=10000)
            except PlaywrightTimeout:
                return LoginResult(
                    success=False,
                    error="Login form not found - page may have changed"
                )
            
            # Enter credentials
            self.page.fill('#username', self.config.email)
            self.page.fill('#password', self.config.password)
            
            # Submit form
            self.page.click('button[type="submit"]')
            
            # Wait for navigation
            time.sleep(5)
            
            # Check if login was successful
            current_url = self.page.url
            
            # Check for common error indicators
            if 'login' in current_url and 'checkpoint' not in current_url:
                # Still on login page - likely failed
                try:
                    error_element = self.page.query_selector('.form__label--error')
                    if error_element:
                        error_text = error_element.text_content()
                        return LoginResult(
                            success=False,
                            error=f"Login failed: {error_text}"
                        )
                except Exception:
                    pass
                
                return LoginResult(
                    success=False,
                    error="Login failed - invalid credentials or unknown error"
                )
            
            # Check for security checkpoint
            if 'checkpoint' in current_url:
                logger.warning(
                    "Security checkpoint detected. "
                    "Manual verification may be required."
                )
                return LoginResult(
                    success=False,
                    error="Security checkpoint - manual verification required"
                )
            
            # Verify login was successful
            if not self._verify_login():
                return LoginResult(
                    success=False,
                    error="Login verification failed"
                )
            
            # Save session cookies
            context = self.page.context
            cookies = context.cookies()
            session_saved = self.session_manager.save_cookies(
                cookies,
                self.config.email
            )
            
            logger.info("Successfully logged in to LinkedIn")
            return LoginResult(success=True, session_saved=session_saved)
        
        except PlaywrightTimeout as e:
            return LoginResult(
                success=False,
                error=f"Timeout during login: {str(e)}"
            )
        
        except Exception as e:
            return LoginResult(
                success=False,
                error=f"Unexpected error during login: {str(e)}"
            )


class LoginManager:
    """
    Main login manager that provides a unified interface.
    
    This class handles login for both Selenium and Playwright,
    with session management and error handling.
    """
    
    def __init__(self, config: ScraperConfig):
        """
        Initialize login manager.
        
        Args:
            config: Scraper configuration
        """
        self.config = config
        self.handler = None
    
    def login_selenium(
        self, 
        driver: webdriver.Chrome,
        use_saved_session: bool = True
    ) -> LoginResult:
        """
        Perform login using Selenium WebDriver.
        
        Args:
            driver: Selenium WebDriver instance
            use_saved_session: Whether to try loading saved session first
        
        Returns:
            LoginResult indicating success or failure
        """
        self.handler = SeleniumLoginHandler(driver, self.config.auth)
        return self.handler.login(use_saved_session)
    
    def login_playwright(
        self,
        page: 'Page',
        use_saved_session: bool = True
    ) -> LoginResult:
        """
        Perform login using Playwright.
        
        Args:
            page: Playwright Page instance
            use_saved_session: Whether to try loading saved session first
        
        Returns:
            LoginResult indicating success or failure
        """
        self.handler = PlaywrightLoginHandler(page, self.config.auth)
        return self.handler.login(use_saved_session)
    
    def clear_session(self) -> bool:
        """
        Clear saved session for configured email.
        
        Returns:
            True if cleared successfully
        """
        if not self.config.auth.email:
            logger.warning("No email configured, cannot clear session")
            return False
        
        session_manager = SessionManager()
        return session_manager.clear_session(self.config.auth.email)
