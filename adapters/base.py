from typing import Protocol, Dict, Any, List, Optional
import json
from dataclasses import dataclass


class PmAdapter(Protocol):
    """
    Protocol defining the interface for all project management tool adapters.
    """
    
    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        """
        Authenticate with the PM tool using the provided credentials.
        :param credentials: A dictionary containing authentication details (OAuth2 tokens, API keys, etc.)
        :return: True if authentication succeeds, False otherwise
        """
        ...
        
    def list_projects(self) -> List[Dict[str, Any]]:
        """
        List all projects accessible to the authenticated user.
        :return: A list of project metadata dictionaries
        """
        ...
        
    def list_sprints(self, project_id: str) -> List[Dict[str, Any]]:
        """
        List all sprints in a given project.
        :param project_id: The ID of the project to query
        :return: A list of sprint metadata dictionaries
        """
        ...
        
    def list_stories(self, project_id: str, sprint_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all stories in a project (optionally filtered by sprint).
        :param project_id: The ID of the project to query
        :param sprint_id: Optional sprint ID to filter stories
        :return: A list of story metadata dictionaries
        """
        ...
        
    def create_story(self, project_id: str, story_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new story in the specified project.
        :param project_id: The ID of the project to create the story in
        :param story_data: A dictionary of story attributes (e.g., title, description, assignee)
        :return: The created story's metadata (including generated ID)
        """
        ...
        
    def normalize_fields(self, external_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert tool-specific field names and values into Story Agent canonical format.
        :param external_data: Raw data from the PM tool
        :return: Data normalized to Story Agent's schema
        """
        ...
        
    def denormalize_fields(self, canonical_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Story Agent canonical format back to tool-specific field names and values.
        :param canonical_data: Data in Story Agent's canonical format
        :return: Data formatted for the PM tool API
        """
        ...


@dataclass
class FieldMappingRule:
    """
    A single rule for mapping between external tool fields and Story Agent canonical fields.
    """
    external_name: str
    canonical_name: str
    transform: Optional[str] = None  # Optional transform function (e.g., "uppercase", "date_to_iso")
    
    def as_dict(self) -> Dict[str, Any]:
        return {
            "external_name": self.external_name,
            "canonical_name": self.canonical_name,
            "transform": self.transform
        }


class FieldMappingDSL:
    """
    Field Mapping Domain-Specific Language (DSL) for translating between PM tool fields
    and Story Agent canonical fields.
    """
    
    def __init__(self, rules: List[FieldMappingRule]):
        self.rules = rules
        
    def add_rule(self, rule: FieldMappingRule) -> None:
        self.rules.append(rule)
        
    def remove_rule(self, external_name: str) -> None:
        self.rules = [r for r in self.rules if r.external_name != external_name]
        
    def to_json(self) -> str:
        """Serialize the mapping rules to JSON."""
        return json.dumps([rule.as_dict() for rule in self.rules])
        
    @classmethod
    def from_json(cls, json_str: str) -> 'FieldMappingDSL':
        """Deserialize mapping rules from JSON."""
        data = json.loads(json_str)
        rules = [FieldMappingRule(**rule_data) for rule_data in data]
        return cls(rules)