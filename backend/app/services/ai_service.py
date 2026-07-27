"""
AI Service - LiteLLM Integration
Enterprise AI Data Analyst - Multi-Provider AI Layer
"""
import os
from typing import Optional, List, Dict, Any
import litellm
from app.config import get_settings
from app.utils.logger import logger


class AIService:
    """Service for handling AI model interactions via LiteLLM"""

    def __init__(self):
        self.settings = get_settings()
        self._configure_providers()

    def _configure_providers(self) -> None:
        """Configure LiteLLM with API keys via environment variables"""
        try:
            if self.settings.OPENAI_API_KEY:
                os.environ["OPENAI_API_KEY"] = self.settings.OPENAI_API_KEY

            if self.settings.GOOGLE_API_KEY:
                os.environ["GOOGLE_API_KEY"] = self.settings.GOOGLE_API_KEY

            if self.settings.ANTHROPIC_API_KEY:
                os.environ["ANTHROPIC_API_KEY"] = self.settings.ANTHROPIC_API_KEY

            if self.settings.GROQ_API_KEY:
                os.environ["GROQ_API_KEY"] = self.settings.GROQ_API_KEY

            # Ollama is local, no key needed
            if self.settings.OLLAMA_BASE_URL:
                os.environ["OLLAMA_API_BASE"] = self.settings.OLLAMA_BASE_URL

            logger.info("LiteLLM providers configured")
        except Exception as e:
            logger.warning(f"Provider configuration warning: {e}")

    def get_available_providers(self) -> Dict[str, Any]:
        """Get list of available AI providers and models"""
        providers = []

        # OpenAI
        if self.settings.OPENAI_API_KEY:
            providers.append({
                "name": "OpenAI",
                "id": "openai",
                "models": [
                    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
                    {"id": "gpt-4", "name": "GPT-4"},
                    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
                ]
            })

        # Anthropic Claude
        if self.settings.ANTHROPIC_API_KEY:
            providers.append({
                "name": "Anthropic",
                "id": "anthropic",
                "models": [
                    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
                    {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
                    {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
                ]
            })

        # Google Gemini
        if self.settings.GOOGLE_API_KEY:
            providers.append({
                "name": "Google",
                "id": "google",
                "models": [
                    {"id": "gemini-pro", "name": "Gemini Pro"},
                ]
            })

        # Groq
        if self.settings.GROQ_API_KEY:
            providers.append({
                "name": "Groq",
                "id": "groq",
                "models": [
                    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B"},
                    {"id": "llama2-70b-4096", "name": "Llama 2 70B"},
                ]
            })

        # Ollama (always available if configured)
        providers.append({
            "name": "Ollama",
            "id": "ollama",
            "models": [
                {"id": "llama2", "name": "Llama 2"},
                {"id": "mistral", "name": "Mistral"},
                {"id": "neural-chat", "name": "Neural Chat"},
            ]
        })

        return {
            "providers": providers,
            "default_provider": self.settings.DEFAULT_AI_PROVIDER,
            "default_model": self.settings.DEFAULT_MODEL
        }

    def get_model_full_id(self, provider: str, model: str) -> str:
        """Get full model ID for LiteLLM"""
        mapping = {
            "openai": lambda m: m,
            "anthropic": lambda m: m,
            "google": lambda m: f"vertex_ai/{m}",
            "groq": lambda m: f"groq/{m}",
            "ollama": lambda m: f"ollama/{m}",
        }

        if provider in mapping:
            return mapping[provider](model)
        return model

    async def generate_completion(
        self,
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Optional[str]:
        """Generate text completion using LiteLLM"""
        try:
            provider = provider or self.settings.DEFAULT_AI_PROVIDER
            model = model or self.settings.DEFAULT_MODEL
            temperature = temperature or self.settings.AI_TEMPERATURE
            max_tokens = max_tokens or self.settings.MAX_TOKENS

            model_id = self.get_model_full_id(provider, model)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            messages.append({"role": "user", "content": prompt})

            response = await litellm.acompletion(
                model=model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=60
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Completion generation error: {e}")
            return None

    async def stream_completion(
        self,
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ):
        """Stream text completion using LiteLLM"""
        try:
            provider = provider or self.settings.DEFAULT_AI_PROVIDER
            model = model or self.settings.DEFAULT_MODEL
            temperature = temperature or self.settings.AI_TEMPERATURE
            max_tokens = max_tokens or self.settings.MAX_TOKENS

            model_id = self.get_model_full_id(provider, model)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            messages.append({"role": "user", "content": prompt})

            response = await litellm.acompletion(
                model=model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                timeout=60
            )

            async for chunk in response:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    yield delta.content

        except Exception as e:
            logger.error(f"Stream completion error: {e}")
            yield f"Error: {str(e)}"


ai_service = AIService()
