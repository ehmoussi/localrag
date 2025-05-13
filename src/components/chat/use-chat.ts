import { ConversationID, Message } from "../../lib/db";
import React from "react";


type ChatAction =
    | { type: "SET_MESSAGES", payload: Message[] }
    | { type: "ADD_MESSAGE", payload: Message }
    | { type: "SET_ASSISTANT_ANSWER", payload: Message | undefined }
    | { type: "ADD_CONVERSATION_STREAMING", payload: ConversationID }
    | { type: "REMOVE_CONVERSATION_STREAMING", payload: ConversationID }


interface ChatState {
    messages: Message[];
    assistantAnswer: Message | undefined;
    isStreaming: Set<ConversationID>;
}


interface IChatContext {
    chatState: ChatState;
    chatDispatch: React.Dispatch<ChatAction>;
}

export const ChatContext = React.createContext<IChatContext | undefined>(undefined);

export const initialChatState: ChatState = {
    messages: [],
    assistantAnswer: undefined,
    isStreaming: new Set(),
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case "SET_MESSAGES":
            return { ...state, messages: action.payload };
        case "ADD_MESSAGE":
            return { ...state, messages: [...state.messages, action.payload] };
        case "SET_ASSISTANT_ANSWER":
            return { ...state, assistantAnswer: action.payload };
        case "ADD_CONVERSATION_STREAMING": {
            const isStreaming = new Set(state.isStreaming);
            isStreaming.add(action.payload);
            return { ...state, isStreaming };
        }
        case "REMOVE_CONVERSATION_STREAMING": {
            const isStreaming = new Set(state.isStreaming);
            isStreaming.delete(action.payload);
            if (state.assistantAnswer?.conversationId == action.payload)
                return { ...state, isStreaming, assistantAnswer: undefined };
            else
                return { ...state, isStreaming };
        }
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
