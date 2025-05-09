import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useLiveQuery } from "dexie-react-hooks";
import { MoreHorizontal, SquarePen, Trash } from "lucide-react";
import { Conversation, deleteConversation, getConversations, getMessages, newConversation } from "./lib/db";
import React from "react";
import { useChat } from "./components/chat/use-chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { setDocumentTitle } from "./lib/utils";


export function ConversationHeader() {
    const { chatDispatch } = useChat();

    const createNewConversation = React.useCallback(async (event: React.FormEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const conversationId = await newConversation();
        chatDispatch({ type: "SET_CONVERSATION", payload: conversationId });
        chatDispatch({ type: "SET_MESSAGES", payload: [] })
    }, [chatDispatch]);

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
    const { chatState, chatDispatch } = useChat();

    const conversationClicked = React.useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const messages = await getMessages(conversation.id);
        chatDispatch({ type: "SET_MESSAGES", payload: messages });
        chatDispatch({ type: "SET_CONVERSATION", payload: conversation.id });
        if (conversation.title !== "")
            setDocumentTitle(conversation.title);
    }, [chatDispatch, conversation.id, conversation.title]);

    const deleteClicked = async (event: React.FormEvent<HTMLDivElement>) => {
        event.preventDefault();
        await deleteConversation(conversation.id);
        chatDispatch({ type: "SET_MESSAGES", payload: [] });
        chatDispatch({ type: "SET_CONVERSATION", payload: undefined });
    };

    const isSelected = conversation.id === chatState.conversationId;
    const title = conversation.title !== "" ? conversation.title : "New Conversation";
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isSelected}
                tooltip={title}
                onClick={(e) => conversationClicked(e)}>
                <a href="#"><span>{title}</span></a>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover={!isSelected}>
                        <MoreHorizontal />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={deleteClicked}>
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
