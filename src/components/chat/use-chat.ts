import { UUID } from "crypto";
import { Message } from "../../lib/db";
import React from "react";


type ChatAction =
    | { type: "SET_CONVERSATION", payload: UUID | undefined }
    | { type: "SET_MESSAGES", payload: Message[] }
    | { type: "ADD_MESSAGE", payload: Message }
    | { type: "SET_ASSISTANT_ANSWER", payload: Message | undefined }
    | { type: "SET_STREAMING", payload: boolean }


interface ChatState {
    conversationId: UUID | undefined;
    messages: Message[];
    assistantAnswer: Message | undefined;
    isStreaming: boolean;
}


interface IChatContext {
    chatState: ChatState;
    chatDispatch: React.Dispatch<ChatAction>;
}

export const ChatContext = React.createContext<IChatContext | undefined>(undefined);

export const initialChatState: ChatState = {
    conversationId: undefined,
    messages: [],
    assistantAnswer: undefined,
    isStreaming: false,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case "SET_CONVERSATION":
            return { ...state, conversationId: action.payload };
        case "SET_MESSAGES":
            return { ...state, messages: action.payload };
        case "ADD_MESSAGE":
            return { ...state, messages: [...state.messages, action.payload] };
        case "SET_ASSISTANT_ANSWER":
            return { ...state, assistantAnswer: action.payload };
        case "SET_STREAMING":
            return { ...state, isStreaming: action.payload };
        default:
            return state;
    };
}

export function useChat(): IChatContext {
    const context = React.useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat can't be used outside a ChatProvider");
    }
    return context;
}
