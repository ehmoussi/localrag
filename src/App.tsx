import React, { memo, useEffect, useRef, useState } from "react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Button } from "./components/ui/button";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";
import ollama from 'ollama'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./components/ui/select";


interface Message {
    id: string;
    role: string;
    content: string;
}

interface MessageProps {
    message: Message;
}

interface MessagesListProps {
    messages: Message[];
    assistantAnswer: Message | undefined;
}

function getOllamaLastModel(): string | null {
    return localStorage.getItem("OllamaLastModel");
}

function setOllamaLastModel(model: string) {
    return localStorage.setItem("OllamaLastModel", model);
}

function createMessage(role: string, content: string, id: string | undefined = undefined): Message {
    let assistantId;
    if (id === undefined) assistantId = crypto.randomUUID();
    else assistantId = id;
    return { id: assistantId, role: role, content: content };
}


function createUserMessage(content: string, id: string | undefined = undefined): Message {
    return createMessage("user", content, id);
}

function createAssistantMessage(content: string, id: string | undefined = undefined): Message {
    return createMessage("assistant", content, id);
}

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

const Message = memo(function Message({ message }: MessageProps) {
    return (
        <div
            data-role={message.role}
            className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line data-[role=assistant]:self-start data-[role=user]:self-end data-[role=assistant]:bg-gray-100 data-[role=user]:bg-blue-500 data-[role=assistant]:text-black data-[role=user]:text-white"
        >
            {message.content}
        </div>
    );
});

function Messages({ messages, assistantAnswer }: MessagesListProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [assistantAnswer]);

    return (
        <div className="my-4 flex h-fit min-h-full flex-col gap-4">
            {
                messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))
            }
            {assistantAnswer ? <Message message={assistantAnswer} /> : undefined}
            <div ref={bottomRef}></div>
        </div>
    );
}

interface ModelsSelectorProps {
    currentModel: string | undefined;
    setCurrentModel: (model: string) => void;
    models: string[];
    isStreaming: () => boolean;
}

function ModelsSelector({ currentModel, setCurrentModel, models, isStreaming }: ModelsSelectorProps) {
    return <Select disabled={isStreaming()} value={currentModel ? currentModel : ""} onValueChange={setCurrentModel}>
        <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                <SelectLabel>Models</SelectLabel>
                {models.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
            </SelectGroup>
        </SelectContent>
    </Select>;
}

function useChat() {
    const [models, setModels] = useState<string[]>([]);
    const [currentModel, setCurrentModel] = useState<string | undefined>(undefined);
    const [messages, setMessages] = useState<Message[]>([]);
    const [assistantAnswer, setAssistantAnswer] = useState<Message | undefined>(undefined);
    const [input, setInput] = useState<string>("");
    const isStreaming = () => assistantAnswer !== undefined;

    // Fetch all the models available
    useEffect(() => {
        let isMounted = true;
        const fetchModels = async () => {
            const responses = await ollama.list();
            if (isMounted) {
                const listModels = responses.models.map((modelResponse) => modelResponse.name);
                setModels(listModels);
            }
        };
        fetchModels().catch((error) => {
            console.error("Failed to fetch the Ollama models:", error);
        });
        return () => { isMounted = false };
    }, []);
    // Set the currentModel
    useEffect(() => {
        if (models.length > 0) {
            const lastModel = getOllamaLastModel();
            // Retrieve the selected model during the last visit if available
            // Othewise select the first one
            if (lastModel && models.includes(lastModel))
                setCurrentModel(lastModel);
            else
                setCurrentModel(models[0]);
        }
        else
            console.log("failed to fetch the models");
    }, [models]);
    // If a currentModel is selected then local storage is updated
    useEffect(() => {
        if (currentModel)
            setOllamaLastModel(currentModel);
    }, [currentModel]);
    // Create a function to append a message and its answer to the Messages
    const append = async (message: string) => {
        // if there is no model selected or a message is currently displayed
        // then can't append a new message 
        if (currentModel === undefined || isStreaming()) return false;
        try {
            // Display the user message
            const userMessage: Message = createUserMessage(message);
            setMessages((prevMessages) => [...prevMessages, userMessage]);
            // Display an empty message for the assistant
            const assistantId = crypto.randomUUID();
            const assistantMessage = createAssistantMessage("", assistantId);
            setAssistantAnswer(assistantMessage);
            // Send the user message
            const response = await ollama.chat({
                model: currentModel,
                messages: [...messages, userMessage],
                stream: true,
            });
            let accumulateContent = "";
            for await (const chunk of response) {
                accumulateContent += chunk.message.content;
                // Dispaly the assistant message currently streaming
                setAssistantAnswer(createAssistantMessage(accumulateContent, assistantId));
            }
            // Update the messages
            setMessages((prevMessages) => [...prevMessages, createAssistantMessage(accumulateContent, assistantId)]);
        } catch (error) {
            console.error("Failed to fetch assistant answer:", error);
        } finally {
            // Remove the streaming message
            setAssistantAnswer(undefined);
        }
        return true;
    };
    return { models, currentModel, setCurrentModel, messages, assistantAnswer, input, setInput, append, isStreaming };
}


function App() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { models, currentModel, setCurrentModel, messages, assistantAnswer, input, setInput, append, isStreaming } = useChat();

    const submitMessage = async () => {
        const oldInput = input;
        setInput("");
        const isOk = await append(input);
        if (!isOk)
            setInput(oldInput);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submitMessage();
    };

    const handleFileUpload = () => {
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            await submitMessage();
        }
    };

    const handleFileButtonClick = () => {

    };

    return (
        <TooltipProvider>
            <main className="ring-none mx-auto flex h-svh max-h-svh w-full max-w-[45rem] flex-col items-stretch border-none">
                <div className="flex-1 content-center overflow-y-auto px-6">
                    {messages.length ? <Messages messages={messages} assistantAnswer={assistantAnswer} /> : <Header />}
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[16px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
                >
                    <div className="flex w-full items-center">
                        <AutoResizeTextarea
                            disabled={isStreaming()}
                            onKeyDown={handleKeyDown}
                            onChange={(v) => { setInput(v) }}
                            value={input}
                            placeholder="Enter a message"
                            className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                        />
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ModelsSelector currentModel={currentModel} setCurrentModel={setCurrentModel} models={models} isStreaming={isStreaming} />
                            </TooltipTrigger>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    disabled={isStreaming()}
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
                                <Button disabled={isStreaming()} variant="ghost" size="sm" className="size-6 rounded-full">
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
