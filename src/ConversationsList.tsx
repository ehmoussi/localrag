import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { UUID } from "crypto";
import { useLiveQuery } from "dexie-react-hooks";
import { SquarePen } from "lucide-react";
import { db } from "./lib/db";
import { getCurrentConversation } from "./lib/storage";

interface Conversation {
    id: UUID;
    title: string,
    isSelected: boolean;
}


export function ConversationsList() {
    const conversations = useLiveQuery(async (): Promise<Conversation[]> => {
        const currentConversationId = getCurrentConversation();
        const conversations = await db.conversations.toArray();
        return conversations.map((conversation) => {
            return {
                id: conversation.id,
                title: "New Conversation",
                isSelected: currentConversationId ? currentConversationId == conversation.id : false,
            };
        });
    });
    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                            <SquarePen />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Conversations</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {conversations &&
                                conversations.map((conversation) => (
                                    <SidebarMenuItem key={conversation.title}>
                                        <SidebarMenuButton asChild isActive={conversation.isSelected}>
                                            <a href="#">
                                                <span>{conversation.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))
                            }
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
