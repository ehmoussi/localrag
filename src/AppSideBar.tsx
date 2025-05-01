import { Sidebar, SidebarContent, SidebarHeader } from "./components/ui/sidebar";
import { ConversationHeader, ConversationsList } from "./ConversationsList";

export function AppSideBar() {
    return (
        <Sidebar>
            <SidebarHeader>
                <ConversationHeader />
            </SidebarHeader>
            <SidebarContent>
                <ConversationsList />
            </SidebarContent>
        </Sidebar>
    );
}