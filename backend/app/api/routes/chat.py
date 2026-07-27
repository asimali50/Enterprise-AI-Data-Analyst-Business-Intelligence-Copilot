"""
Chat Routes
Enterprise AI Data Analyst - Chat API
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
import uuid
from typing import Optional
from app.services.ai_service import ai_service
from app.database.sqlite_client import get_sqlite
from app.database.models import ChatMessage as ChatMessageModel
from app.schemas import ChatRequest, ChatResponse
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message")
async def send_message(request: ChatRequest) -> ChatResponse:
    """
    Send a message about a dataset.

    The AI agent will analyze the dataset and answer the question.

    - **dataset_id**: Dataset to query
    - **message**: The question or request
    - **conversation_history**: Previous messages for context
    """
    try:
        from app.database.models import Dataset

        # Validate dataset exists
        db = get_sqlite().get_session()
        try:
            dataset = db.query(Dataset).filter(
                Dataset.id == request.dataset_id
            ).first()

            if not dataset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dataset not found"
                )

            # Build context from dataset
            context = f"""
You are an AI data analyst assistant. You have access to a dataset with the following structure:
- Filename: {dataset.filename}
- Rows: {dataset.num_rows}
- Columns: {dataset.num_columns}
- Column Info: {dataset.columns_info}

User Question: {request.message}

Provide a clear, concise answer based on the dataset information available.
            """

            # Generate response
            response_text = await ai_service.generate_completion(
                prompt=request.message,
                system_prompt=context
            )

            if not response_text:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate response"
                )

            # Save to chat history
            chat_msg = ChatMessageModel(
                id=str(uuid.uuid4()),
                dataset_id=request.dataset_id,
                role="assistant",
                content=response_text
            )
            db.add(chat_msg)
            db.commit()

            logger.info(f"Chat message processed: {request.dataset_id}")

            return ChatResponse(
                dataset_id=request.dataset_id,
                message=response_text,
                streaming=False
            )

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/history/{dataset_id}")
async def get_chat_history(dataset_id: str, limit: int = 50) -> dict:
    """Get chat history for a dataset"""
    try:
        db = get_sqlite().get_session()
        try:
            messages = db.query(ChatMessageModel).filter(
                ChatMessageModel.dataset_id == dataset_id
            ).order_by(ChatMessageModel.timestamp.desc()).limit(limit).all()

            return {
                "dataset_id": dataset_id,
                "messages": [
                    {
                        "id": msg.id,
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.timestamp
                    }
                    for msg in reversed(messages)
                ]
            }
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
