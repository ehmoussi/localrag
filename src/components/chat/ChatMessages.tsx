import React from "react";
import { ConversationID, Message } from "../../lib/db";
import { useChat } from "./use-chat";
import { AssistantMessage, UserMessage } from "./ChatMessage";

function Header() {
    return (
        <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">AI Chatbot With RAG</h1>
            <p className="text-muted-foreground text-sm">
                Connect an API Key from your provider and send a message to get started or use a local model by installing <a className="underline" href="https://ollama.com/download">Ollama</a>.
            </p>
        </header>
    );
}

const MessageComp = React.memo(function MessageComp({ message }: { message: Message }) {
    if (message.role == "user")
        return <UserMessage message={message} />
    else
        return <AssistantMessage message={message} />
});


function AnswerMessage({ assistantAnswer, conversationId }: { assistantAnswer: Message | undefined, conversationId: ConversationID | undefined }) {
    const bottomRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [assistantAnswer]);

    return (
        <>
            {
                assistantAnswer && assistantAnswer.conversationId == conversationId ? <AssistantMessage message={assistantAnswer} /> : undefined
            }
            <div ref={bottomRef}></div>
        </>
    );
}


export function ChatMessages() {
    const { chatState } = useChat();
    return (
        <div className="flex-1 content-center overflow-y-auto px-6">
            {
                chatState.messages.length ?
                    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
                        {
                            chatState.messages.map((message) => (
                                <MessageComp key={message.id} message={message} />
                            ))
                        }
                        <AnswerMessage assistantAnswer={chatState.assistantAnswer} conversationId={chatState.conversationId} />
                    </div> :
                    <Header />
            }
        </div>
    );
}
