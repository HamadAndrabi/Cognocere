from typing import Dict, List, Any
import asyncio

from models.schemas import SearchPlan, WebSearchResults, WebSearchResult
from services.serper_service import search_and_fetch

async def perform_web_search(search_plan: SearchPlan) -> WebSearchResults:
    """
    Perform web search based on the search plan.
    
    Args:
        search_plan: The search plan with queries
        
    Returns:
        WebSearchResults with search results and query mapping
    """
    # Calculate results per query based on depth
    results_per_query = min(3 + search_plan.depth, 5)  # Base 3 + additional based on depth, max 5
    
    # Perform searches for all queries
    results_by_query = await search_and_fetch(
        search_plan.queries,
        num_results_per_query=results_per_query
    )
    
    # Combine all results
    all_results = []
    query_mapping = {}  # Maps queries to result indices
    
    for query, query_results in results_by_query.items():
        # Track indices for this query
        query_indices = []
        
        for result in query_results:
            # Check if this URL is already in all_results
            existing_indices = [
                i for i, r in enumerate(all_results) 
                if r.url == result["url"]
            ]
            
            if existing_indices:
                # URL already exists, just add this query to its mapping
                query_indices.append(str(existing_indices[0]))  # Convert index to string
            else:
                # New URL, add to all_results
                all_results.append(WebSearchResult(
                    url=result["url"],
                    title=result["title"],
                    snippet=result["snippet"],
                    content=result.get("content", "")
                ))
                query_indices.append(str(len(all_results) - 1))  # Convert index to string
        
        # Store mapping for this query
        query_mapping[query] = query_indices
    
    return WebSearchResults(
        results=all_results,
        query_mapping=query_mapping
    )