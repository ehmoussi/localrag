import { ConversationID } from "./db";

export function getOllamaLastModel(): string | null {
    return localStorage.getItem("ollama_last_model");
}

export function setOllamaLastModel(model: string) {
    return localStorage.setItem("ollama_last_model", model);
}

export function getCurrentConversation(): ConversationID | undefined {
    const conversationId = localStorage.getItem("current_conversation_id");
    if (conversationId === null) return undefined;
    return conversationId as ConversationID;
}

export function setCurrentConversation(conversationId: ConversationID) {
    return localStorage.setItem("current_conversation_id", conversationId);
}
