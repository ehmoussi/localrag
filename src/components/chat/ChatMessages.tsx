import React from "react";
import { Message } from "../../lib/db";
import { useChat } from "./use-chat";

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
    return (
        <div
            data-role={message.role}
            className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
        >
            {message.content}
        </div>
    );
});

function AssistantMessage({ assistantAnswer }: { assistantAnswer: Message | undefined }) {
    const bottomRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [assistantAnswer]);

    return (
        <>
            {
                assistantAnswer ? <MessageComp message={assistantAnswer} /> : undefined
            }
            <div ref={bottomRef}></div>
        </>
    );
}


export function ChatMessages() {
    const { state } = useChat();
    return (
        <div className="flex-1 content-center overflow-y-auto px-6">
            {
                state.messages.length ?
                    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
                        {
                            state.messages.map((message) => (
                                <MessageComp key={message.id} message={message} />
                            ))
                        }
                        <AssistantMessage assistantAnswer={state.assistantAnswer} />
                    </div> :
                    <Header />
            }
        </div>
    );
}
