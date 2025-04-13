import React, { useEffect, useRef, useState } from "react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Button } from "./components/ui/button";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";
import ollama from 'ollama'


interface Message {
    role: string;
    content: string;
}

interface MessageProps {
    message: Message;
}

interface MessagesListProps {
    messages: Message[];
}

function Header() {
    return (
        <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">AI Chatbot With RAG</h1>
            <p className="text-muted-foreground text-sm">
                Connect an API Key from your provider and send a message to get started.
            </p>
        </header>
    );
}

function Message({ message }: MessageProps) {
    return (
        <div
            data-role={message.role}
            className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
        >
            {message.content}
        </div>
    );
}

function Messages({ messages }: MessagesListProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="my-4 flex h-fit min-h-full flex-col gap-4">
            {
                messages.map((message, index) => (
                    <Message key={index} message={message} />
                ))
            }
            <div ref={bottomRef}></div>
        </div>
    );
}

async function* useOllama(messages: Message[]): AsyncGenerator<Message, void, void> {
    console.log(messages);
    const response = await ollama.chat({
        model: "llama3.1",
        messages: messages,
        stream: true,
    });
    for await (const chunk of response) {
        yield (chunk.message as Message);
    }
}

function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [isStreaming, setStreaming] = useState<boolean>(false);

    const append = async (message: string) => {
        if (isStreaming) return;
        setStreaming(true);
        const userMessage = { role: "user", content: message };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setMessages((prevMessages) => [...prevMessages, { role: "assistant", content: "" }]);
        for await (const chunk of useOllama([...messages, userMessage])) {
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1] = {
                    ...prevMessages[prevMessages.length - 1],
                    content: prevMessages[prevMessages.length - 1].content + chunk.content
                }
                return newMessages;
            });
        }
        setStreaming(false);
    };

    return { messages, input, setInput, append, isStreaming };
}


function App() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { messages, input, setInput, append, isStreaming } = useChat();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        append(input);
        setInput("");
    };

    const handleFileUpload = () => {

    };

    const handleKeyDown = () => {

    };

    const handleFileButtonClick = () => {

    };

    return (
        <TooltipProvider>
            <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[35rem] flex-col items-stretch border-none">
                <div className="flex-1 content-center overflow-y-auto px-6">
                    {messages.length ? <Messages messages={messages} /> : <Header />}
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[16px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
                >
                    <div className="flex w-full items-center">
                        <AutoResizeTextarea
                            disabled={isStreaming}
                            onKeyDown={handleKeyDown}
                            onChange={(v) => { setInput(v) }}
                            value={input}
                            placeholder="Enter a message"
                            className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                        />
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    disabled={isStreaming}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mr-1 size-6 rounded-full"
                                    onClick={handleFileButtonClick}
                                >
                                    <PaperclipIcon size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={12}>Attach file</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button disabled={isStreaming} variant="ghost" size="sm" className="size-6 rounded-full">
                                    <ArrowUpIcon size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={12}>Submit</TooltipContent>
                        </Tooltip>
                    </div>
                </form>
            </main>
        </TooltipProvider>
    )
}

export default App
