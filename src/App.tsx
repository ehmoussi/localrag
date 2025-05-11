import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { ChatProvider } from "./components/chat/ChatProvider";
import { ChatForm } from "./components/chat/ChatForm";
import { ChatMessages } from "./components/chat/ChatMessages";
import { AppSideBar } from "./AppSideBar";
import { ModelProvider } from "./components/chat/ModelProvider";
import { StreamingProvider } from "./components/chat/StreamingProvider";



function App() {

    return (
        <ChatProvider>
            <SidebarProvider>
                <AppSideBar />
                <SidebarTrigger />
                <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[80rem] flex-col items-stretch border-none">
                    <StreamingProvider>
                        <ModelProvider>
                            <ChatMessages />
                            <TooltipProvider>
                                <ChatForm />
                            </TooltipProvider>
                        </ModelProvider>
                    </StreamingProvider>
                </main >
            </SidebarProvider>
        </ChatProvider>
    )
}

export default App
