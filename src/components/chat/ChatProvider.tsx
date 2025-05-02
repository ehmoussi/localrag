import React from "react";
import { ChatContext, chatReducer, initialChatState } from "./use-chat";



export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [chatState, chatDispatch] = React.useReducer(chatReducer, initialChatState);
    return (
        <ChatContext.Provider value={{ chatState, chatDispatch }}>
            {children}
        </ChatContext.Provider>
    );
}