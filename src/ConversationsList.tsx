import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { UUID } from "crypto";
import { useLiveQuery } from "dexie-react-hooks";
import { MoreHorizontal, SquarePen, Trash } from "lucide-react";
import { Conversation, db, getConversations, getMessages, newConversation } from "./lib/db";
import React from "react";
import { useChat } from "./components/chat/use-chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";


export function ConversationHeader() {
    const { dispatch } = useChat();

    const createNewConversation = React.useCallback(async (event: React.FormEvent<HTMLAnchorElement>) => {
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


const ConversationItem = React.memo(({ conversation }: { conversation: Conversation }) => {
    const { state, dispatch } = useChat();

    const selectConversation = React.useCallback(async (event: React.FormEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const messages = await getMessages(conversation.id);
        dispatch({ type: "SET_MESSAGES", payload: messages });
        dispatch({ type: "SET_CONVERSATION", payload: conversation.id });
    }, [dispatch]);

    const deleteConversation = async (event: React.FormEvent<HTMLDivElement>) => {
        event.preventDefault();
        await db.conversations.delete(conversation.id);
        dispatch({ type: "SET_MESSAGES", payload: [] });
        dispatch({ type: "SET_CONVERSATION", payload: undefined });
    };

    const isSelected = conversation.id === state.conversationId;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isSelected}>
                <a href="#" onClick={(e) => selectConversation(e)}>
                    <span>{conversation.title ? conversation.title : "New Conversation"}</span>
                </a>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover={!isSelected}>
                        <MoreHorizontal />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={deleteConversation}>
                        <Trash />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem >
    );
});



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
