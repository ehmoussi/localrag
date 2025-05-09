import React from "react";
import { useChat } from "./use-chat";
import { ConversationID, createMessage, extractThinking, Message } from "@/lib/db";
import ollama from 'ollama';


const BUFFER_STREAMING_SIZE: number = 30;

export function useAssistantStreaming() {
    const { chatState, chatDispatch } = useChat();

    const streamAssistantMessage = React.useCallback(async (currentConversationId: ConversationID, userMessage: Message, currentModel: string): Promise<Message> => {
        const assistantId = crypto.randomUUID();
        let accumulateContent = "";
        const newMessage = createMessage(currentConversationId, "assistant", "", assistantId);
        try {
            // Display an empty message for the assistant
            const assistantMessage = createMessage(currentConversationId, "assistant", "", assistantId);
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: assistantMessage });
            // Send the user message
            const response = await ollama.chat({
                model: currentModel,
                messages: [...chatState.messages, userMessage],
                stream: true,
            });
            let buffer = "";
            for await (const chunk of response) {
                buffer += chunk.message.content;
                // Dispaly the assistant message currently streaming
                if (buffer.length > BUFFER_STREAMING_SIZE) {
                    accumulateContent += buffer;
                    const { thinking, answer } = extractThinking(accumulateContent);
                    chatDispatch({
                        type: "SET_ASSISTANT_ANSWER",
                        payload: createMessage(currentConversationId, "assistant", answer, assistantId, thinking)
                    });
                    buffer = "";
                }
            }
            if (buffer.length > 0) {
                accumulateContent += buffer;
                const { thinking, answer } = extractThinking(accumulateContent);
                // Dispaly the assistant message currently streaming
                chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: createMessage(currentConversationId, "assistant", answer, assistantId, thinking) });
            }
        } catch (error) {
            console.error("Failed to fetch assistant answer:", error);
        } finally {
            // Remove the streaming message
            const { thinking, answer } = extractThinking(accumulateContent);
            newMessage.thinking = thinking;
            newMessage.content = answer;
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
        }
        return newMessage;
    }, [chatState.messages, chatDispatch]);

    return { streamAssistantMessage };
}