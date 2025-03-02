from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class ResearchQuery(BaseModel):
    """User's initial research query"""
    topic: str = Field(..., description="The research topic provided by the user")
    depth: Optional[str] = Field("medium", description="Desired research depth (basic, medium, deep)")
    
class ClarificationQuestion(BaseModel):
    """Individual clarification question"""
    id: str
    question: str
    
class ClarificationQuestions(BaseModel):
    """Set of clarification questions for the user"""
    questions: List[ClarificationQuestion]
    
class ClarificationResponse(BaseModel):
    """User's answers to clarification questions"""
    answers: Dict[str, str] = Field(..., description="Mapping of question IDs to answers")
    
class SearchPlan(BaseModel):
    """Plan for searching the web"""
    queries: List[str] = Field(..., description="List of search queries to perform")
    depth: int = Field(1, description="Depth of the search (iterations)")
    
class WebSearchResult(BaseModel):
    """Individual web search result"""
    url: str
    title: str
    snippet: str
    content: Optional[str] = None
    
class WebSearchResults(BaseModel):
    """Collection of web search results"""
    results: List[WebSearchResult]
    query_mapping: Dict[str, List[str]] = Field(
        default_factory=dict, description="Mapping of queries to result indices"
    )
    
class CuratedContext(BaseModel):
    """Curated and organized research context"""
    content: str = Field(..., description="Organized context content")
    sources: List[Dict[str, Any]] = Field(..., description="Source information for citations")
    structure: Dict[str, Any] = Field(..., description="Structure of the curated content")
    
class EvaluationResult(BaseModel):
    """Evaluation of the research context"""
    is_sufficient: bool = Field(..., description="Whether the context is sufficient")
    missing_aspects: List[str] = Field([], description="Aspects that need more research")
    additional_queries: List[str] = Field([], description="Additional queries to perform")
    confidence_score: float = Field(..., description="Confidence score (0-1)")
    
class ReportSection(BaseModel):
    """Individual section of the final report"""
    title: str
    content: str
    references: List[int] = Field([], description="Indices of sources referenced in this section")
    
class FinalReport(BaseModel):
    """Final research report"""
    title: str
    introduction: str
    sections: List[ReportSection]
    conclusion: str
    references: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(..., description="Metadata about the report generation")