import React from "react";
import { ChatContext, chatReducer, initialChatState } from "./use-chat";



export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = React.useReducer(chatReducer, initialChatState);
    return (
        <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>
    );
}