import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useLiveQuery } from "dexie-react-hooks";
import { MoreHorizontal, SquarePen, Trash } from "lucide-react";
import { Conversation, ConversationID, deleteConversation, getConversations, newConversation } from "./lib/db";
import React from "react";
import { useChat } from "./components/chat/use-chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { useAssistantStreaming } from "./components/chat/use-assistantstreaming";
import { Link, useNavigate, useParams } from "react-router";


export function ConversationHeader() {
    const { chatDispatch } = useChat();
    const navigate = useNavigate();

    const createNewConversation = React.useCallback(async (event: React.FormEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const conversationId = await newConversation();
        chatDispatch({ type: "SET_MESSAGES", payload: [] });
        chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
        navigate(`/${conversationId}`);
    }, [chatDispatch, navigate]);

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


const ConversationItem = React.memo(({ conversationId, title, isActive }: { conversationId: ConversationID, title: string, isActive: boolean }) => {
    const { chatDispatch } = useChat();
    const { terminateWorker } = useAssistantStreaming();
    const navigate = useNavigate();

    const deleteClicked = async (event: React.FormEvent<HTMLDivElement>) => {
        event.preventDefault();
        chatDispatch({ type: "SET_MESSAGES", payload: [] });
        terminateWorker(conversationId);
        await deleteConversation(conversationId);
        navigate("/");
    };

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={title}>
                <Link to={`/${conversationId}`}><span>{title}</span></Link>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover={!isActive}>
                        <MoreHorizontal />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={deleteClicked}>
                        <Trash />
                        <span >Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem >
    );
});



export function ConversationsList() {
    const { conversationId } = useParams<{ conversationId: ConversationID }>();

    const conversations = useLiveQuery(async (): Promise<Conversation[]> => {
        return await getConversations();
    }, []);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {conversations !== undefined &&
                        conversations.map((conversation) => (
                            <ConversationItem
                                key={conversation.id}
                                conversationId={conversation.id}
                                title={conversation.title}
                                isActive={conversationId !== undefined && conversation.id === conversationId} />
                        ))
                    }
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
