import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { UUID } from "crypto";
import { useLiveQuery } from "dexie-react-hooks";
import { SquarePen } from "lucide-react";
import { Conversation, getConversations, getMessages, newConversation } from "./lib/db";
import React, { useCallback } from "react";
import { useChat } from "./components/chat/ChatProvider";


export function ConversationHeader() {
    const { dispatch } = useChat();

    const createNewConversation = useCallback(async (event: React.FormEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const conversationId = await newConversation();
        dispatch({ type: "SET_CONVERSATION", payload: conversationId });
        dispatch({ type: "SET_MESSAGES", payload: [] })
    }, [dispatch]);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton>
                    <a href="#" onClick={createNewConversation}>
                        <SquarePen />
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}


function ConversationItem({ conversation }: { conversation: Conversation }) {
    const { state, dispatch } = useChat();

    const selectConversation = useCallback(async (event: React.FormEvent<HTMLAnchorElement>, conversationId: UUID) => {
        event.preventDefault();
        const messages = await getMessages(conversationId);
        dispatch({ type: "SET_MESSAGES", payload: messages });
        dispatch({ type: "SET_CONVERSATION", payload: conversationId });
    }, [dispatch]);

    return (
        <SidebarMenuItem key={conversation.id}>
            <SidebarMenuButton asChild isActive={conversation.id === state.conversationId}>
                <a href="#" onClick={(e) => selectConversation(e, conversation.id)}>
                    <span>{conversation.title ? conversation.title : "New Conversation"}</span>
                </a>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}



export function ConversationsList() {
    const conversations = useLiveQuery(async (): Promise<Conversation[]> => {
        return await getConversations();
    }, []);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {conversations &&
                        conversations.map((conversation) => (
                            <ConversationItem key={conversation.id} conversation={conversation} />
                        ))
                    }
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
