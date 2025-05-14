import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { ChatProvider } from "./components/chat/ChatProvider";
import { ChatForm } from "./components/chat/ChatForm";
import { ChatMessages } from "./components/chat/ChatMessages";
import { AppSideBar } from "./AppSideBar";
import { ModelProvider } from "./components/chat/ModelProvider";
import { useParams } from "react-router";
import { ConversationID } from "./lib/db";
import { Header } from "./Header";
import { WorkerPoolProvider } from "./components/chat/WorkerPoolProvider";


function App() {
    const { conversationId } = useParams<{ conversationId: ConversationID }>();
    console.log(`conversationId in App = ${conversationId}`);
    return (
        <SidebarProvider>
            <ChatProvider>
                <WorkerPoolProvider>
                    <AppSideBar />
                    <SidebarTrigger />
                    <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[80rem] flex-col items-stretch border-none">
                        <ModelProvider>
                            {conversationId !== undefined ? <ChatMessages conversationId={conversationId} /> : <Header />}
                            <TooltipProvider>
                                <ChatForm conversationId={conversationId} />
                            </TooltipProvider>
                        </ModelProvider>
                    </main >
                </WorkerPoolProvider>
            </ChatProvider >
        </SidebarProvider>
    )
}

export default App
