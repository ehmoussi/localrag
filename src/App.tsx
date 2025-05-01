import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { ChatProvider } from "./components/chat/ChatProvider";
import { ChatForm } from "./components/chat/ChatForm";
import { ChatMessages } from "./components/chat/ChatMessages";
import { AppSideBar } from "./AppSideBar";



function App() {
    return (
        <ChatProvider>
            <SidebarProvider>
                <AppSideBar />
                <SidebarTrigger />
                <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[45rem] flex-col items-stretch border-none">
                    <ChatMessages />
                    <TooltipProvider>
                        <ChatForm />
                    </TooltipProvider>
                </main >
            </SidebarProvider>
        </ChatProvider>
    )
}

export default App
