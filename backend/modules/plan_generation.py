from typing import Dict, List, Any
import json

from models.schemas import SearchPlan
from services.llm_service import get_structured_llm_response
from services.serper_service import search_web

# System message for search plan generation
PLAN_SYSTEM_MESSAGE = """
You are an expert research strategist tasked with creating an optimal plan for web research.
Your goal is to generate specific search queries that will yield comprehensive and relevant information.
Each query should target a different aspect of the topic to ensure thorough coverage.
"""

async def generate_search_plan(topic: str, clarification_answers: Dict[str, str]) -> SearchPlan:
    """
    Generate a search plan based on the research topic and clarification answers.
    
    Args:
        topic: The research topic
        clarification_answers: The answers to clarification questions
        
    Returns:
        A SearchPlan object with specific search queries
    """
    # First, do a light search to gather initial context
    initial_results = await search_web(topic, num_results=3)
    
    # Extract snippets from initial results
    snippets = [result.get("snippet", "") for result in initial_results]
    initial_context = "\n\n".join(snippets)
    
    # Format clarification answers for the prompt
    formatted_answers = "\n".join([
        f"Question: {q_id}\nAnswer: {answer}" 
        for q_id, answer in clarification_answers.get("answers", {}).items()
    ])
    
    prompt = f"""
    I need to create a comprehensive research plan for the following topic:
    
    Topic: "{topic}"
    
    The user has provided the following clarifications:
    {formatted_answers}
    
    Initial search results provided these snippets:
    {initial_context}
    
    Based on this information, generate 5-8 specific search queries that will cover different aspects of the topic.
    Each query should be focused and specific to yield high-quality results.
    Try to cover the breadth of the topic while also diving deep into important areas.
    """
    
    # Define the expected output schema
    output_schema = {
        "queries": ["string"]
    }
    
    # Get structured response from LLM
    response = await get_structured_llm_response(
        prompt=prompt,
        output_schema=output_schema,
        system_message=PLAN_SYSTEM_MESSAGE
    )
    
    return SearchPlan(
        queries=response.get("queries", []),
        depth=1
    )