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
        navigate(`/${conversationId}`);
        chatDispatch({ type: "SET_MESSAGES", payload: [] })
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


const ConversationItem = React.memo(({ conversationId, title }: { conversationId: ConversationID, title: string }) => {
    const { chatDispatch } = useChat();
    const { terminateWorker } = useAssistantStreaming();
    const { conversationId: activeConversationId } = useParams();
    const navigate = useNavigate();

    const deleteClicked = async (event: React.FormEvent<HTMLDivElement>) => {
        event.preventDefault();
        chatDispatch({ type: "SET_MESSAGES", payload: [] });
        terminateWorker(conversationId);
        await deleteConversation(conversationId);
        navigate("/");
    };

    const isSelected = conversationId === activeConversationId;
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isSelected}
                tooltip={title}>
                <Link to={`/${conversationId}`}><span>{title}</span></Link>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover={!isSelected}>
                        <MoreHorizontal />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="text-red">
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
                            <ConversationItem key={conversation.id} conversationId={conversation.id} title={conversation.title} />
                        ))
                    }
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
