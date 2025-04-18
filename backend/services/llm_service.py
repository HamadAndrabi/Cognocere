from typing import Dict, List, Any, AsyncGenerator, Optional
import json
from openai import OpenAI, AsyncOpenAI
import google.generativeai as genai
import asyncio
import os
import logging

from config import Settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()

# Define supported models and their providers
SUPPORTED_MODELS = {
    "gpt-4o": {"provider": "openai", "api_model_name": "gpt-4o"},
    "gpt-4o-mini": {"provider": "openai", "api_model_name": "gpt-4o-mini"},
    "gemini-2.0-flash": {"provider": "google", "api_model_name": "gemini-2.0-flash"}, # Updated to use correct model name
    # Add more models here in the future
}

DEFAULT_MODEL_ID = "gpt-4o" # Define a default model

# Cache for initialized clients to avoid re-creating them
_clients = {}

def log_model_usage(module_name: str, model_id: str, provider: str):
    """Log which model is being used by which module."""
    logger.info(f"Module '{module_name}' using {provider.upper()} model: {model_id}")

async def get_api_client(provider: str):
    """Initializes and returns the appropriate async API client based on the provider."""
    if provider in _clients:
        return _clients[provider]

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        _clients[provider] = client
        return client
    elif provider == "google":
        if not settings.google_api_key:
            raise ValueError("Google API key not configured")
        try:
            genai.configure(api_key=settings.google_api_key)
        except Exception as e:
            logger.warning(f"Warning: genai.configure encountered an issue (may be harmless if already configured): {e}")
        _clients[provider] = "configured"
        return "configured"
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

def get_default_llm_settings(model_id: Optional[str] = None, module_name: Optional[str] = None) -> Dict[str, Any]:
    """Determines the model, provider, and API model name to use."""
    if model_id and model_id in SUPPORTED_MODELS:
        selected_model_id = model_id
    else:
        selected_model_id = settings.llm_model if settings.llm_model in SUPPORTED_MODELS else DEFAULT_MODEL_ID
        if model_id:
            logger.warning(f"Warning: Requested model '{model_id}' not found or supported. Falling back to '{selected_model_id}'.")

    model_info = SUPPORTED_MODELS[selected_model_id]
    
    if module_name:
        log_model_usage(module_name, selected_model_id, model_info["provider"])
        
    return {
        "model_id": selected_model_id,
        "provider": model_info["provider"],
        "api_model_name": model_info["api_model_name"],
    }

async def get_llm_response(
    prompt: str,
    model_id: Optional[str] = None,
    system_message: str = "You are a helpful research assistant.",
    temperature: float = None,
    max_tokens: int = None,
    module_name: Optional[str] = None
) -> str:
    """
    Get a response from the selected LLM model.
    """
    model_settings = get_default_llm_settings(model_id, module_name)
    provider = model_settings["provider"]
    api_model_name = model_settings["api_model_name"]

    client = await get_api_client(provider)

    temp = temperature if temperature is not None else settings.llm_temperature

    if provider == "openai":
        tokens = max_tokens if max_tokens is not None else settings.llm_max_tokens
        response = await client.chat.completions.create(
            model=api_model_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=temp,
            max_tokens=tokens
        )
        return response.choices[0].message.content
    elif provider == "google":
        try:
            generation_config = genai.types.GenerationConfig(
                temperature=temp,
            )
            model = genai.GenerativeModel(
                api_model_name,
                system_instruction=system_message
            )
            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config
            )
            if response.candidates:
                if response.candidates[0].content and response.candidates[0].content.parts:
                    return response.candidates[0].content.parts[0].text
                else:
                    return response.text
            else:
                error_msg = f"Gemini response blocked or empty. Feedback: {getattr(response, 'prompt_feedback', 'No feedback available')}"
                logger.error(error_msg)
                raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Error with Gemini API: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

async def get_structured_llm_response(
    prompt: str,
    output_schema: Dict[str, Any],
    model_id: Optional[str] = None,
    system_message: str = "You are a helpful research assistant that responds with structured JSON.",
    temperature: float = 0.1,
    module_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get a structured JSON response from the selected LLM model.
    """
    model_settings = get_default_llm_settings(model_id, module_name)

    enhanced_prompt = f"{prompt}\n\nRespond ONLY with a valid JSON object matching this schema (do NOT include ```json markers):\n{json.dumps(output_schema, indent=2)}"

    try:
        response_text = await get_llm_response(
            prompt=enhanced_prompt,
            model_id=model_settings["model_id"],
            system_message=system_message,
            temperature=temperature,
            module_name=module_name
        )

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            if "```json" in response_text:
                try:
                    json_part = response_text.split("```json")[1].split("```")[0].strip()
                    return json.loads(json_part)
                except (IndexError, json.JSONDecodeError):
                    pass
            try:
                import re
                json_match = re.search(r'\{\s*.*?\s*\}|\[\s*.*?\s*\]', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
                else:
                    logger.error(f"LLM structured response parsing failed. Raw response: {response_text}")
                    # Return a default fallback response to prevent loops in the research flow
                    return {
                        "is_sufficient": True,
                        "missing_aspects": ["Error parsing LLM response as JSON"],
                        "additional_queries": [],
                        "confidence_score": 0.5,
                        "queries": ["Error parsing LLM response"]
                    }
            except Exception as e:
                logger.error(f"LLM structured response parsing failed. Raw response: {response_text}. Error: {e}")
                # Return a default fallback response
                return {
                    "is_sufficient": True,
                    "missing_aspects": [f"Error parsing LLM response: {str(e)}"],
                    "additional_queries": [],
                    "confidence_score": 0.5,
                    "queries": ["Error parsing LLM response"]
                }
    except ValueError as e:
        logger.error(f"LLM response error: {str(e)}")
        # Return a default fallback response for provider-specific errors
        return {
            "is_sufficient": True,
            "missing_aspects": [f"Error from LLM provider: {str(e)}"],
            "additional_queries": [],
            "confidence_score": 0.5,
            "queries": ["Error from LLM provider"]
        }

async def stream_llm_response(
    prompt: str,
    model_id: Optional[str] = None,
    system_message: str = "You are a helpful research assistant.",
    temperature: float = None,
    max_tokens: int = None,
    module_name: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Stream a response from the selected LLM model.
    """
    model_settings = get_default_llm_settings(model_id, module_name)
    provider = model_settings["provider"]
    api_model_name = model_settings["api_model_name"]

    # Just ensure the client is initialized, but don't try to use the return value directly
    await get_api_client(provider)

    temp = temperature if temperature is not None else settings.llm_temperature

    logger.info(f"STREAM_LLM_RESPONSE: Checking provider '{provider}' for model '{api_model_name}'")

    if provider == "openai":
        logger.info("STREAM_LLM_RESPONSE: Entering OpenAI block")
        client = _clients["openai"]
        tokens = max_tokens if max_tokens is not None else settings.llm_max_tokens
        stream = await client.chat.completions.create(
            model=api_model_name,
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
            await asyncio.sleep(0.01)

    elif provider == "google":
        logger.info("STREAM_LLM_RESPONSE: Entering Google block")
        generation_config = genai.types.GenerationConfig(
            temperature=temp,
        )
        model = genai.GenerativeModel(
            api_model_name,
            system_instruction=system_message
        )
        # Use generate_content_async for async iteration
        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config,
            stream=True
        )
        async for chunk in response:
            if chunk.text:
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            await asyncio.sleep(0.01)
    else:
        logger.error(f"STREAM_LLM_RESPONSE: Unknown provider '{provider}' encountered.")
        raise ValueError(f"Unsupported LLM provider: {provider}")