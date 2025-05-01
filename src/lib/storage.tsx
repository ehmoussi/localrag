import { UUID } from "crypto";

export function getOllamaLastModel(): string | null {
    return localStorage.getItem("ollama_last_model");
}

export function setOllamaLastModel(model: string) {
    return localStorage.setItem("ollama_last_model", model);
}

export function getCurrentConversation(): UUID | undefined {
    const conversationId = localStorage.getItem("current_conversation_id") as UUID;
    if (conversationId === null) return undefined;
    return conversationId;
}

export function setCurrentConversation(conversationId: UUID) {
    return localStorage.setItem("current_conversation_id", conversationId);
}
