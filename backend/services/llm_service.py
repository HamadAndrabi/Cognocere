from typing import Dict, List, Any, AsyncGenerator
import json
from openai import OpenAI, AsyncOpenAI
import asyncio

from config import Settings

# Load settings
settings = Settings()

# Initialize OpenAI clients
sync_client = OpenAI(api_key=settings.openai_api_key)
async_client = AsyncOpenAI(api_key=settings.openai_api_key)

async def get_llm_response(
    prompt: str,
    system_message: str = "You are a helpful research assistant.",
    temperature: float = None,
    max_tokens: int = None
) -> str:
    """
    Get a response from the LLM model.
    
    Args:
        prompt: The user prompt to send to the model
        system_message: The system message to set the context
        temperature: Override default temperature if provided
        max_tokens: Override default max tokens if provided
        
    Returns:
        The model's response as a string
    """
    temp = temperature if temperature is not None else settings.llm_temperature
    tokens = max_tokens if max_tokens is not None else settings.llm_max_tokens
    
    response = await async_client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ],
        temperature=temp,
        max_tokens=tokens
    )
    
    return response.choices[0].message.content

async def get_structured_llm_response(
    prompt: str,
    output_schema: Dict[str, Any],
    system_message: str = "You are a helpful research assistant that responds with structured JSON.",
    temperature: float = 0.1
) -> Dict[str, Any]:
    """
    Get a structured JSON response from the LLM model.
    
    Args:
        prompt: The user prompt to send to the model
        output_schema: The expected JSON schema for the response
        system_message: The system message to set the context
        temperature: The temperature parameter for the model
        
    Returns:
        The model's response as a structured dictionary
    """
    # Add schema information to the prompt
    enhanced_prompt = f"{prompt}\n\nRespond with a JSON object matching this schema:\n{json.dumps(output_schema, indent=2)}"
    
    # Get response from the model
    response_text = await get_llm_response(
        prompt=enhanced_prompt,
        system_message=system_message,
        temperature=temperature
    )
    
    # Parse JSON response
    try:
        # Extract JSON if it's wrapped in markdown code blocks
        if "```json" in response_text:
            json_part = response_text.split("```json")[1].split("```")[0].strip()
            return json.loads(json_part)
        # Otherwise try to parse the entire response
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: try to extract any JSON-like structure
        try:
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            else:
                raise ValueError("Could not extract valid JSON from LLM response")
        except:
            raise ValueError("Could not parse LLM response as JSON")

async def stream_llm_response(
    prompt: str,
    system_message: str = "You are a helpful research assistant.",
    temperature: float = None,
    max_tokens: int = None
) -> AsyncGenerator[str, None]:
    """
    Stream a response from the LLM model.
    
    Args:
        prompt: The user prompt to send to the model
        system_message: The system message to set the context
        temperature: Override default temperature if provided
        max_tokens: Override default max tokens if provided
        
    Yields:
        Chunks of the model's response as they are generated
    """
    temp = temperature if temperature is not None else settings.llm_temperature
    tokens = max_tokens if max_tokens is not None else settings.llm_max_tokens
    
    stream = await async_client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ],
        temperature=temp,
        max_tokens=tokens,
        stream=True
    )
    
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            yield f"data: {json.dumps({'text': chunk.choices[0].delta.content})}\n\n"
        await asyncio.sleep(0.01)  # Small delay to prevent overwhelming the client