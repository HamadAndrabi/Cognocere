from typing import Dict, List, Any
import json
from collections import defaultdict

from models.schemas import WebSearchResults, CuratedContext
from services.llm_service import get_llm_response, get_structured_llm_response

# System message for context curation
CURATION_SYSTEM_MESSAGE = """
You are an expert research curator tasked with organizing and summarizing web search results.
Your goal is to extract relevant information, remove duplicates, and structure the content in a coherent way.
Focus on facts, insights, and information that directly relates to the research topic.
Maintain neutrality and present multiple perspectives where applicable.
"""

async def curate_context(search_results: WebSearchResults) -> CuratedContext:
    """
    Curate and organize web search results into a coherent context.
    
    Args:
        search_results: The web search results
        
    Returns:
        A CuratedContext object with organized content and source information
    """
    # Group results by query
    query_results = defaultdict(list)
    for query, indices in search_results.query_mapping.items():
        for idx_str in indices:
            # Convert string index to integer
            try:
                idx = int(idx_str)
                if idx < len(search_results.results):
                    query_results[query].append(search_results.results[idx])
            except (ValueError, TypeError) as e:
                print(f"Error processing index {idx_str}: {str(e)}")
    
    # Process each query group
    summaries = []
    sources = []
    source_index = 0  # For tracking sources
    
    for query, results in query_results.items():
        # Skip if no results
        if not results:
            continue
        
        # Extract titles and snippets
        context_parts = []
        current_sources = []
        
        for result in results:
            try:
                # Safely handle content
                content_to_use = ""
                if hasattr(result, 'content') and result.content:
                    if not isinstance(result.content, str):
                        # Convert non-string content to string
                        content_to_use = str(result.content)
                    else:
                        content_to_use = result.content
                
                # Use content or snippet based on availability
                if content_to_use and not content_to_use.startswith('['):
                    # Use full content if available and not an error message
                    # Safely truncate and clean the content
                    safe_content = content_to_use[:2000].replace('\x00', '')  # Remove null bytes
                    context_parts.append(f"Title: {result.title}\nContent: {safe_content}...")
                else:
                    # Fall back to snippet
                    context_parts.append(f"Title: {result.title}\nSnippet: {result.snippet}")
                
                # Add to sources
                current_sources.append({
                    "url": result.url,
                    "title": result.title,
                    "index": source_index
                })
                source_index += 1
            except Exception as e:
                print(f"Error processing result {result.url if hasattr(result, 'url') else 'unknown'}: {str(e)}")
                # Skip this result if there's an error
        
        # Combine context parts
        if context_parts:
            combined_context = "\n\n---\n\n".join(context_parts)
            
            # Create a summary for this query
            try:
                summary_prompt = f"""
                Summarize the following information retrieved for the query: "{query}"
                
                {combined_context}
                
                Create a concise summary that captures the key information, facts, and insights.
                Focus on information that directly addresses the query.
                Include specific data points, statistics, and quotes where relevant.
                Be brief and focus on the most relevant information.
                """
                
                summary = await get_llm_response(
                    prompt=summary_prompt,
                    system_message=CURATION_SYSTEM_MESSAGE
                )
                
                # Add to summaries and sources
                summaries.append(f"## Information for: {query}\n\n{summary}")
                sources.extend(current_sources)
            except Exception as e:
                print(f"Error creating summary for query '{query}': {str(e)}")
                # Add a placeholder if summary generation fails
                summaries.append(f"## Information for: {query}\n\n[Unable to generate summary]")
                sources.extend(current_sources)
    
    # Check if we have any summaries
    if not summaries:
        # Create a default summary if no results were processed successfully
        summaries = ["## No valid search results\n\nThe search did not return any valid results that could be processed."]
    
    # Combine all summaries into a structured document
    content = "\n\n".join(summaries)
    
    # Generate a structural analysis of the content
    try:
        structure_prompt = f"""
        Analyze the following research content and create a structural outline:
        
        {content[:2000]}...  # Send a sample of the content
        
        Generate a JSON structure that outlines the main topics, subtopics, and key points covered.
        This structure will be used to organize the final report.
        """
        
        structure_schema = {
            "main_topics": [
                {
                    "title": "string",
                    "subtopics": [
                        {
                            "title": "string",
                            "key_points": ["string"]
                        }
                    ]
                }
            ]
        }
        
        structure = await get_structured_llm_response(
            prompt=structure_prompt,
            output_schema=structure_schema,
            system_message="You are a research content analyzer. Create a structured outline of the content."
        )
    except Exception as e:
        print(f"Error generating structure: {str(e)}")
        # Create a default structure if structure generation fails
        structure = {
            "main_topics": [
                {
                    "title": "Research Summary",
                    "subtopics": [
                        {
                            "title": "Key Findings",
                            "key_points": ["Unable to structure the content"]
                        }
                    ]
                }
            ]
        }
    
    return CuratedContext(
        content=content,
        sources=sources,
        structure=structure
    )