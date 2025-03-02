import aiohttp
import asyncio
from typing import Dict, List, Any
import json

from config import Settings

# Load settings
settings = Settings()

async def search_web(query: str, num_results: int = 10) -> List[Dict[str, Any]]:
    """
    Search the web using Serper API.
    
    Args:
        query: The search query
        num_results: Number of results to return (default: 10)
        
    Returns:
        List of search results
    """
    headers = {
        "X-API-KEY": settings.serper_api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "q": query,
        "num": num_results
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            settings.serper_api_url,
            headers=headers,
            json=payload
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Serper API error: {response.status} - {error_text}")
                
            data = await response.json()
            
            # Process and format results
            processed_results = []
            
            # Process organic results
            if "organic" in data:
                for result in data["organic"]:
                    processed_results.append({
                        "url": result.get("link"),
                        "title": result.get("title", ""),
                        "snippet": result.get("snippet", "")
                    })
            
            return processed_results

async def fetch_content(url: str) -> str:
    """
    Fetch the content of a webpage.
    
    Args:
        url: The URL to fetch
        
    Returns:
        The content of the webpage
    """
    try:
        # Skip PDF, image and other binary files based on URL extension
        if any(ext in url.lower() for ext in ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.gif']):
            return f"[This is a document/binary file: {url}]"
            
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status != 200:
                    return ""
                
                # Check content type to avoid binary files
                content_type = response.headers.get('Content-Type', '').lower()
                if 'text/html' not in content_type and 'text/plain' not in content_type:
                    return f"[Content type not supported: {content_type}]"
                
                try:
                    content = await response.text()
                    return content
                except UnicodeDecodeError:
                    # Try with different encoding or return a placeholder
                    try:
                        raw_content = await response.read()
                        return raw_content.decode('latin-1')
                    except:
                        return f"[Content encoding not supported: {url}]"
    except Exception as e:
        print(f"Error fetching content from {url}: {str(e)}")
        return f"[Error fetching content: {url}]"

async def search_and_fetch(queries: List[str], num_results_per_query: int = 5) -> Dict[str, List[Dict[str, Any]]]:
    """
    Search the web for multiple queries and fetch content.
    
    Args:
        queries: List of search queries
        num_results_per_query: Number of results to fetch per query
        
    Returns:
        Dictionary mapping queries to their search results with content
    """
    results = {}
    
    # Process queries in parallel
    async def process_query(query):
        search_results = await search_web(query, num_results_per_query)
        
        # Fetch content for each result in parallel
        fetch_tasks = [fetch_content(result["url"]) for result in search_results]
        contents = await asyncio.gather(*fetch_tasks)
        
        # Add content to results
        for i, content in enumerate(contents):
            if content:  # Only include if content was successfully fetched
                search_results[i]["content"] = content
        
        results[query] = [r for r in search_results if r.get("content")]
    
    # Process all queries in parallel
    query_tasks = [process_query(query) for query in queries]
    await asyncio.gather(*query_tasks)
    
    return results