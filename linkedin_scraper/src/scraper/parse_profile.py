"""
Profile parsing module for LinkedIn scraper.

Extracts structured data from LinkedIn profile HTML using BeautifulSoup.
Handles missing or malformed data gracefully with proper error handling.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from bs4 import BeautifulSoup
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class Experience:
    """Represents a single work experience entry from a LinkedIn profile."""
    
    title: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: str = ""
    
    def __post_init__(self):
        """Validate and clean experience data."""
        # Strip whitespace from all string fields
        self.title = self.title.strip() if self.title else ""
        self.company = self.company.strip() if self.company else ""
        self.description = self.description.strip() if self.description else ""
        
        if self.start_date:
            self.start_date = self.start_date.strip()
        if self.end_date:
            self.end_date = self.end_date.strip()
    
    def to_dict(self) -> dict:
        """Convert experience to dictionary for export."""
        return {
            'title': self.title,
            'company': self.company,
            'start_date': self.start_date or '',
            'end_date': self.end_date or '',
            'description': self.description,
        }


@dataclass
class ProfileData:
    """Represents complete LinkedIn profile data."""
    
    name: str
    headline: str = ""
    location: str = ""
    about: str = ""
    experiences: List[Experience] = field(default_factory=list)
    url: str = ""
    scraped_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate and clean profile data."""
        # Strip whitespace from all string fields
        self.name = self.name.strip() if self.name else ""
        self.headline = self.headline.strip() if self.headline else ""
        self.location = self.location.strip() if self.location else ""
        self.about = self.about.strip() if self.about else ""
        self.url = self.url.strip() if self.url else ""
        
        # Validate required fields
        if not self.name:
            raise ValueError("Profile name is required")
    
    def to_dict(self) -> dict:
        """Convert profile to dictionary for export."""
        return {
            'name': self.name,
            'headline': self.headline,
            'location': self.location,
            'about': self.about,
            'experiences': [exp.to_dict() for exp in self.experiences],
            'url': self.url,
            'scraped_at': self.scraped_at.isoformat(),
        }
    
    def get_experience_count(self) -> int:
        """Get the number of experience entries."""
        return len(self.experiences)
    
    def get_total_experience_text(self) -> str:
        """Get concatenated text from all experiences for search/analysis."""
        return " ".join([
            f"{exp.title} {exp.company} {exp.description}"
            for exp in self.experiences
        ])


class ProfileParser:
    """
    Parser for extracting structured data from LinkedIn profile HTML.
    
    Uses BeautifulSoup to parse HTML and extract profile information including
    name, headline, location, about section, and work experience.
    """
    
    def __init__(self):
        """Initialize the profile parser."""
        self.logger = logging.getLogger(__name__)
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[dict]:
        """
        Extract JSON-LD structured data from LinkedIn profile.
        
        LinkedIn includes Schema.org structured data in <script type="application/ld+json">
        which is much more reliable than parsing HTML.
        
        Args:
            soup: BeautifulSoup object of the page
        
        Returns:
            Dictionary with Person data or None if not found
        """
        import json
        
        # Find all script tags with type="application/ld+json"
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                if not script.string:
                    continue
                    
                data = json.loads(script.string)
                
                # LinkedIn includes multiple JSON-LD objects in @graph
                if '@graph' in data:
                    for item in data['@graph']:
                        if item.get('@type') == 'Person':
                            self.logger.debug("Found Person data in @graph")
                            return item
                elif data.get('@type') == 'Person':
                    self.logger.debug("Found Person data")
                    return data
            except json.JSONDecodeError as e:
                self.logger.debug(f"Failed to parse JSON-LD: {e}")
                continue
            except Exception as e:
                self.logger.debug(f"Error processing JSON-LD: {e}")
                continue
        
        return None
    
    def _parse_from_json_ld(self, json_data: dict, url: str) -> ProfileData:
        """
        Parse profile from JSON-LD structured data.
        
        Args:
            json_data: Dictionary with Person schema.org data
            url: Original profile URL
        
        Returns:
            ProfileData object
        """
        # Extract name (required)
        name = json_data.get('name', '')
        if not name:
            raise ValueError("Profile name not found in JSON-LD data")
        
        # Extract job title/headline
        job_titles = json_data.get('jobTitle', [])
        if isinstance(job_titles, list):
            headline = ', '.join(job_titles) if job_titles else ''
        else:
            headline = str(job_titles) if job_titles else ''
        
        # Extract location
        location = ''
        address = json_data.get('address', {})
        if isinstance(address, dict):
            locality = address.get('addressLocality', '')
            country = address.get('addressCountry', '')
            if locality and country:
                location = f"{locality}, {country}"
            elif locality:
                location = locality
            elif country:
                location = country
        
        # Extract about/description
        about = json_data.get('description', '')
        
        # Extract work experiences
        experiences = []
        works_for = json_data.get('worksFor', [])
        
        if not isinstance(works_for, list):
            works_for = [works_for] if works_for else []
        
        for work in works_for:
            if not isinstance(work, dict):
                continue
                
            company = work.get('name', '')
            if not company:
                continue
            
            # Get role information
            member = work.get('member', {})
            if isinstance(member, dict):
                start_date = member.get('startDate', '')
                end_date = member.get('endDate', '')
                
                # Convert dates to strings if they're numbers
                if isinstance(start_date, int):
                    start_date = str(start_date)
                if isinstance(end_date, int):
                    end_date = str(end_date)
            else:
                start_date = ''
                end_date = ''
            
            # Use headline as title if available, otherwise use first job title
            title = headline.split(',')[0].strip() if headline else 'Position'
            
            exp = Experience(
                title=title,
                company=company,
                start_date=start_date if start_date else None,
                end_date=end_date if end_date else None,
                description=''
            )
            experiences.append(exp)
        
        profile = ProfileData(
            name=name,
            headline=headline,
            location=location,
            about=about,
            experiences=experiences,
            url=url,
            scraped_at=datetime.now()
        )
        
        self.logger.info(
            f"Successfully parsed profile from JSON-LD: {name} with {len(experiences)} experiences"
        )
        self.logger.debug(f"Profile data - Headline: {headline[:50] if headline else 'None'}")
        self.logger.debug(f"Profile data - Location: {location}")
        self.logger.debug(f"Profile data - About length: {len(about) if about else 0} chars")
        self.logger.debug(f"Profile data - Experiences: {[exp.company for exp in experiences]}")
        
        return profile
    
    def parse_html(self, html: str, url: str = "") -> ProfileData:
        """
        Parse LinkedIn profile HTML and extract structured data.
        
        First tries to extract JSON-LD structured data (most reliable),
        then falls back to HTML parsing if needed.
        
        Args:
            html: Raw HTML content of the LinkedIn profile page
            url: Original profile URL (optional, for tracking)
        
        Returns:
            ProfileData object containing extracted profile information
        
        Raises:
            ValueError: If HTML cannot be parsed or required fields are missing
        """
        if not html or not html.strip():
            raise ValueError("Empty HTML content provided")
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Check if we have valid HTML
            if not soup.find():
                raise ValueError("Invalid HTML structure")
            
            # Try JSON-LD extraction first (most reliable for public profiles)
            try:
                json_ld_data = self._extract_json_ld(soup)
                if json_ld_data:
                    self.logger.info("Using JSON-LD structured data")
                    return self._parse_from_json_ld(json_ld_data, url)
            except Exception as e:
                self.logger.warning(f"JSON-LD extraction failed, falling back to HTML parsing: {e}")
            
            # Fallback to HTML parsing
            self.logger.info("Using HTML parsing")
            
            # Extract basic profile information with error handling
            try:
                name = self._extract_name(soup)
            except ValueError:
                # Re-raise name errors as they're required
                raise
            except Exception as e:
                self.logger.error(f"Unexpected error extracting name: {e}")
                raise ValueError(f"Failed to extract profile name: {str(e)}")
            
            # Extract optional fields with graceful degradation
            try:
                headline = self._extract_headline(soup)
            except Exception as e:
                self.logger.warning(f"Error extracting headline: {e}")
                headline = ""
            
            try:
                location = self._extract_location(soup)
            except Exception as e:
                self.logger.warning(f"Error extracting location: {e}")
                location = ""
            
            try:
                about = self._extract_about(soup)
            except Exception as e:
                self.logger.warning(f"Error extracting about section: {e}")
                about = ""
            
            # Extract experience entries with error handling
            try:
                experiences = self._extract_experiences(soup)
            except Exception as e:
                self.logger.warning(f"Error extracting experiences: {e}")
                experiences = []
            
            # Create and return ProfileData object
            profile = ProfileData(
                name=name,
                headline=headline,
                location=location,
                about=about,
                experiences=experiences,
                url=url,
                scraped_at=datetime.now()
            )
            
            self.logger.info(
                f"Successfully parsed profile: {name} with {len(experiences)} experiences"
            )
            
            return profile
            
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            self.logger.error(f"Error parsing profile HTML: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to parse profile HTML: {str(e)}")
    
    def _extract_name(self, soup: BeautifulSoup) -> str:
        """
        Extract profile name from HTML.
        
        Tries multiple selectors to handle different LinkedIn page structures.
        """
        # Try multiple possible selectors for name
        selectors = [
            'h1.profile-name',
            'h1[class*="profile-name"]',
            'h1[class*="name"]',
            '.profile-header h1',
            'h1',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text(strip=True):
                name = element.get_text(strip=True)
                self.logger.debug(f"Found name using selector '{selector}': {name}")
                return name
        
        # If no name found, raise error as it's required
        self.logger.warning("Could not find profile name in HTML")
        raise ValueError("Profile name not found in HTML")
    
    def _extract_headline(self, soup: BeautifulSoup) -> str:
        """Extract profile headline/title."""
        selectors = [
            '.profile-headline',
            'div[class*="headline"]',
            '.profile-header .headline',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                headline = element.get_text(strip=True)
                self.logger.debug(f"Found headline: {headline}")
                return headline
        
        self.logger.debug("No headline found, returning empty string")
        return ""
    
    def _extract_location(self, soup: BeautifulSoup) -> str:
        """Extract profile location."""
        selectors = [
            '.profile-location',
            'div[class*="location"]',
            '.profile-header .location',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                location = element.get_text(strip=True)
                self.logger.debug(f"Found location: {location}")
                return location
        
        self.logger.debug("No location found, returning empty string")
        return ""
    
    def _extract_about(self, soup: BeautifulSoup) -> str:
        """Extract about/summary section."""
        selectors = [
            '.about-content',
            '.about-section .content',
            'section.about-section div[class*="content"]',
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                about = element.get_text(strip=True)
                self.logger.debug(f"Found about section ({len(about)} chars)")
                return about
        
        self.logger.debug("No about section found, returning empty string")
        return ""
    
    def _extract_experiences(self, soup: BeautifulSoup) -> List[Experience]:
        """
        Extract all work experience entries from the profile.
        
        Returns:
            List of Experience objects, empty list if none found
        """
        experiences = []
        
        # Find all experience items
        experience_items = soup.select('.experience-item')
        
        if not experience_items:
            self.logger.debug("No experience items found")
            return experiences
        
        self.logger.debug(f"Found {len(experience_items)} experience items")
        
        for item in experience_items:
            try:
                experience = self._parse_experience_item(item)
                if experience:
                    experiences.append(experience)
            except Exception as e:
                self.logger.warning(f"Error parsing experience item: {str(e)}")
                # Continue processing other items even if one fails
                continue
        
        return experiences
    
    def _parse_experience_item(self, item: BeautifulSoup) -> Optional[Experience]:
        """
        Parse a single experience item element.
        
        Args:
            item: BeautifulSoup element containing experience data
        
        Returns:
            Experience object or None if parsing fails
        """
        try:
            # Extract title (required)
            title_elem = item.select_one('.experience-title, h3')
            if not title_elem:
                self.logger.warning("Experience item missing title, skipping")
                return None
            title = title_elem.get_text(strip=True)
            
            # Extract company (required)
            company_elem = item.select_one('.experience-company')
            if not company_elem:
                self.logger.warning("Experience item missing company, skipping")
                return None
            company = company_elem.get_text(strip=True)
            
            # Extract dates (optional)
            start_date = None
            end_date = None
            
            start_elem = item.select_one('.start-date')
            if start_elem:
                start_date = start_elem.get_text(strip=True)
            
            end_elem = item.select_one('.end-date')
            if end_elem:
                end_date = end_elem.get_text(strip=True)
            
            # Extract description (optional)
            description = ""
            desc_elem = item.select_one('.experience-description')
            if desc_elem:
                description = desc_elem.get_text(strip=True)
            
            experience = Experience(
                title=title,
                company=company,
                start_date=start_date,
                end_date=end_date,
                description=description
            )
            
            self.logger.debug(f"Parsed experience: {title} at {company}")
            return experience
            
        except Exception as e:
            self.logger.error(f"Error parsing experience item: {str(e)}")
            return None


# Convenience function for quick parsing
def parse_profile(html: str, url: str = "") -> ProfileData:
    """
    Convenience function to parse a LinkedIn profile HTML.
    
    Args:
        html: Raw HTML content of the LinkedIn profile page
        url: Original profile URL (optional)
    
    Returns:
        ProfileData object containing extracted profile information
    """
    parser = ProfileParser()
    return parser.parse_html(html, url)
