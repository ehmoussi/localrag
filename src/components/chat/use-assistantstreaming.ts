import React from "react";
import { useChat } from "./use-chat";
import { ConversationID, createMessage, Message } from "@/lib/db";
import ollama from 'ollama';


const BUFFER_STREAMING_SIZE: number = 40;

export function useAssistantStreaming() {
    const { chatState, chatDispatch } = useChat();

    const streamAssistantMessage = React.useCallback(async (currentConversationId: ConversationID, userMessage: Message, currentModel: string): Promise<Message | undefined> => {
        try {
            // Display an empty message for the assistant
            let assistantId = crypto.randomUUID();
            const assistantMessage = createMessage(currentConversationId, "assistant", "", assistantId);
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: assistantMessage });
            // Send the user message
            const response = await ollama.chat({
                model: currentModel,
                messages: [...chatState.messages, userMessage],
                stream: true,
            });
            let accumulateContent = "";
            let buffer = "";
            for await (const chunk of response) {
                buffer += chunk.message.content;
                // Dispaly the assistant message currently streaming
                if (buffer.length > BUFFER_STREAMING_SIZE) {
                    accumulateContent += buffer;
                    chatDispatch({
                        type: "SET_ASSISTANT_ANSWER",
                        payload: createMessage(currentConversationId, "assistant", accumulateContent, assistantId)
                    });
                    buffer = "";
                }
            }
            if (buffer.length > 0) {
                accumulateContent += buffer;
                // Dispaly the assistant message currently streaming
                chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: createMessage(currentConversationId, "assistant", accumulateContent, assistantId) });
            }
            return createMessage(currentConversationId, "assistant", accumulateContent, assistantId);
        } catch (error) {
            console.error("Failed to fetch assistant answer:", error);
        } finally {
            // Remove the streaming message
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
        }
    }, [chatState.messages, chatDispatch]);

    return { streamAssistantMessage };
}