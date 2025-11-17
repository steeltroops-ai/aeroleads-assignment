"""
Data export module for LinkedIn scraper.

Provides CSV and JSON export capabilities with proper data serialization,
formatting, and error handling. Validates data before export to ensure
data integrity.
"""

import csv
import json
import logging
from pathlib import Path
from typing import List, Union
from datetime import datetime

from .parse_profile import ProfileData, Experience

logger = logging.getLogger(__name__)


class ExportError(Exception):
    """Custom exception for export-related errors."""
    pass


class DataValidator:
    """
    Validates profile data before export.
    
    Ensures data integrity and catches potential issues that could
    cause export failures.
    """
    
    @staticmethod
    def validate_profiles(profiles: List[ProfileData]) -> None:
        """
        Validate a list of profiles before export.
        
        Args:
            profiles: List of ProfileData objects to validate
        
        Raises:
            ExportError: If validation fails
        """
        if not profiles:
            raise ExportError("Cannot export empty profile list")
        
        if not isinstance(profiles, list):
            raise ExportError("Profiles must be provided as a list")
        
        for idx, profile in enumerate(profiles):
            if not isinstance(profile, ProfileData):
                raise ExportError(
                    f"Item at index {idx} is not a ProfileData object"
                )
            
            # Validate required fields
            if not profile.name:
                raise ExportError(
                    f"Profile at index {idx} is missing required 'name' field"
                )
        
        logger.info(f"Validated {len(profiles)} profiles for export")


class CSVExporter:
    """
    Exports profile data to CSV format.
    
    Creates a flattened CSV representation of profile data with proper
    escaping and encoding. Handles multiple experiences by creating
    separate rows or concatenating them.
    """
    
    def __init__(self, flatten_experiences: bool = True):
        """
        Initialize CSV exporter.
        
        Args:
            flatten_experiences: If True, concatenate all experiences into
                single fields. If False, create separate rows for each experience.
        """
        self.flatten_experiences = flatten_experiences
        self.logger = logging.getLogger(__name__)
    
    def export(
        self,
        profiles: List[ProfileData],
        output_path: Union[str, Path],
        validate: bool = True
    ) -> str:
        """
        Export profiles to CSV file.
        
        Args:
            profiles: List of ProfileData objects to export
            output_path: Path where CSV file should be written
            validate: Whether to validate data before export
        
        Returns:
            Path to the created CSV file
        
        Raises:
            ExportError: If export fails
        """
        try:
            # Validate data if requested
            if validate:
                DataValidator.validate_profiles(profiles)
            
            # Convert to Path object
            output_path = Path(output_path)
            
            # Ensure parent directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Export based on flattening preference
            if self.flatten_experiences:
                self._export_flattened(profiles, output_path)
            else:
                self._export_expanded(profiles, output_path)
            
            self.logger.info(
                f"Successfully exported {len(profiles)} profiles to {output_path}"
            )
            
            return str(output_path)
            
        except ExportError:
            raise
        except Exception as e:
            self.logger.error(f"Error exporting to CSV: {str(e)}")
            raise ExportError(f"Failed to export CSV: {str(e)}")
    
    def _export_flattened(
        self,
        profiles: List[ProfileData],
        output_path: Path
    ) -> None:
        """
        Export profiles with experiences concatenated into single row.
        
        Each profile becomes one row with experience data joined together.
        """
        fieldnames = [
            'name',
            'headline',
            'location',
            'about',
            'experience_count',
            'experience_titles',
            'experience_companies',
            'experience_dates',
            'url',
            'scraped_at'
        ]
        
        try:
            with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
                writer = csv.DictWriter(
                    csvfile, 
                    fieldnames=fieldnames,
                    quoting=csv.QUOTE_MINIMAL,
                    escapechar='\\'
                )
                writer.writeheader()
                
                for profile in profiles:
                    try:
                        # Concatenate experience data with proper escaping
                        exp_titles = ' | '.join([
                            self._sanitize_csv_field(exp.title) 
                            for exp in profile.experiences
                        ])
                        exp_companies = ' | '.join([
                            self._sanitize_csv_field(exp.company) 
                            for exp in profile.experiences
                        ])
                        exp_dates = ' | '.join([
                            f"{exp.start_date or 'N/A'} - {exp.end_date or 'Present'}"
                            for exp in profile.experiences
                        ])
                        
                        row = {
                            'name': self._sanitize_csv_field(profile.name),
                            'headline': self._sanitize_csv_field(profile.headline),
                            'location': self._sanitize_csv_field(profile.location),
                            'about': self._sanitize_csv_field(profile.about[:500] if profile.about else ''),
                            'experience_count': len(profile.experiences),
                            'experience_titles': exp_titles,
                            'experience_companies': exp_companies,
                            'experience_dates': exp_dates,
                            'url': profile.url,
                            'scraped_at': profile.scraped_at.isoformat()
                        }
                        
                        writer.writerow(row)
                    except Exception as e:
                        self.logger.error(f"Error writing profile {profile.name}: {e}")
                        # Continue with next profile instead of failing completely
                        continue
        except IOError as e:
            raise ExportError(f"Failed to write CSV file: {e}")
    
    def _sanitize_csv_field(self, text: str) -> str:
        """
        Sanitize text field for CSV export.
        
        Removes problematic characters and normalizes whitespace.
        """
        if not text:
            return ''
        
        # Replace newlines and tabs with spaces
        text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        
        # Normalize multiple spaces to single space
        text = ' '.join(text.split())
        
        # Remove null bytes and other control characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
        
        return text.strip()
    
    def _export_expanded(
        self,
        profiles: List[ProfileData],
        output_path: Path
    ) -> None:
        """
        Export profiles with separate row for each experience.
        
        Creates multiple rows per profile if they have multiple experiences.
        """
        fieldnames = [
            'name',
            'headline',
            'location',
            'about',
            'experience_title',
            'experience_company',
            'experience_start_date',
            'experience_end_date',
            'experience_description',
            'url',
            'scraped_at'
        ]
        
        try:
            with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
                writer = csv.DictWriter(
                    csvfile, 
                    fieldnames=fieldnames,
                    quoting=csv.QUOTE_MINIMAL,
                    escapechar='\\'
                )
                writer.writeheader()
                
                for profile in profiles:
                    try:
                        # If no experiences, write one row with profile data
                        if not profile.experiences:
                            row = {
                                'name': self._sanitize_csv_field(profile.name),
                                'headline': self._sanitize_csv_field(profile.headline),
                                'location': self._sanitize_csv_field(profile.location),
                                'about': self._sanitize_csv_field(profile.about[:500] if profile.about else ''),
                                'experience_title': '',
                                'experience_company': '',
                                'experience_start_date': '',
                                'experience_end_date': '',
                                'experience_description': '',
                                'url': profile.url,
                                'scraped_at': profile.scraped_at.isoformat()
                            }
                            writer.writerow(row)
                        else:
                            # Write one row per experience
                            for exp in profile.experiences:
                                row = {
                                    'name': self._sanitize_csv_field(profile.name),
                                    'headline': self._sanitize_csv_field(profile.headline),
                                    'location': self._sanitize_csv_field(profile.location),
                                    'about': self._sanitize_csv_field(profile.about[:500] if profile.about else ''),
                                    'experience_title': self._sanitize_csv_field(exp.title),
                                    'experience_company': self._sanitize_csv_field(exp.company),
                                    'experience_start_date': exp.start_date or '',
                                    'experience_end_date': exp.end_date or '',
                                    'experience_description': self._sanitize_csv_field(exp.description[:200] if exp.description else ''),
                                    'url': profile.url,
                                    'scraped_at': profile.scraped_at.isoformat()
                                }
                                writer.writerow(row)
                    except Exception as e:
                        self.logger.error(f"Error writing profile {profile.name}: {e}")
                        # Continue with next profile instead of failing completely
                        continue
        except IOError as e:
            raise ExportError(f"Failed to write CSV file: {e}")


class JSONExporter:
    """
    Exports profile data to JSON format.
    
    Creates a structured JSON representation of profile data with proper
    formatting and encoding. Preserves the full data structure including
    nested experiences.
    """
    
    def __init__(self, pretty: bool = True):
        """
        Initialize JSON exporter.
        
        Args:
            pretty: If True, format JSON with indentation for readability
        """
        self.pretty = pretty
        self.logger = logging.getLogger(__name__)
    
    def export(
        self,
        profiles: List[ProfileData],
        output_path: Union[str, Path],
        validate: bool = True
    ) -> str:
        """
        Export profiles to JSON file.
        
        Args:
            profiles: List of ProfileData objects to export
            output_path: Path where JSON file should be written
            validate: Whether to validate data before export
        
        Returns:
            Path to the created JSON file
        
        Raises:
            ExportError: If export fails
        """
        try:
            # Validate data if requested
            if validate:
                DataValidator.validate_profiles(profiles)
            
            # Convert to Path object
            output_path = Path(output_path)
            
            # Ensure parent directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert profiles to dictionaries
            data = {
                'profiles': [profile.to_dict() for profile in profiles],
                'metadata': {
                    'total_profiles': len(profiles),
                    'exported_at': datetime.now().isoformat(),
                    'version': '1.0.0'
                }
            }
            
            # Write JSON file
            with open(output_path, 'w', encoding='utf-8') as jsonfile:
                if self.pretty:
                    json.dump(data, jsonfile, indent=2, ensure_ascii=False)
                else:
                    json.dump(data, jsonfile, ensure_ascii=False)
            
            self.logger.info(
                f"Successfully exported {len(profiles)} profiles to {output_path}"
            )
            
            return str(output_path)
            
        except ExportError:
            raise
        except Exception as e:
            self.logger.error(f"Error exporting to JSON: {str(e)}")
            raise ExportError(f"Failed to export JSON: {str(e)}")


def export_profiles(
    profiles: List[ProfileData],
    output_path: Union[str, Path],
    format: str = 'csv',
    **kwargs
) -> str:
    """
    Convenience function to export profiles in specified format.
    
    Args:
        profiles: List of ProfileData objects to export
        output_path: Path where file should be written
        format: Export format ('csv' or 'json')
        **kwargs: Additional arguments passed to exporter
    
    Returns:
        Path to the created file
    
    Raises:
        ExportError: If export fails or format is invalid
    
    Examples:
        >>> profiles = [profile1, profile2]
        >>> export_profiles(profiles, 'output.csv', format='csv')
        'output.csv'
        >>> export_profiles(profiles, 'output.json', format='json', pretty=True)
        'output.json'
    """
    format = format.lower()
    
    if format == 'csv':
        exporter = CSVExporter(**kwargs)
        return exporter.export(profiles, output_path)
    elif format == 'json':
        exporter = JSONExporter(**kwargs)
        return exporter.export(profiles, output_path)
    else:
        raise ExportError(
            f"Unsupported export format: {format}. Use 'csv' or 'json'."
        )
