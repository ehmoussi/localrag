import React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { useChat } from "./use-chat";
import { addMessage, createAssistantMessage, createUserMessage, db, newConversation } from "../../lib/db";
import { getOllamaLastModel, setCurrentConversation, setOllamaLastModel } from "../../lib/storage";
import ollama from 'ollama';
import { AutoResizeTextarea } from "../../AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";
import { UUID } from "crypto";

interface ModelsSelectorProps {
    currentModel: string | undefined;
    setCurrentModel: (model: string) => void;
    models: string[];
    isStreaming: boolean;
}

function ModelsSelector({ currentModel, setCurrentModel, models, isStreaming }: ModelsSelectorProps) {
    return (
        <Select disabled={isStreaming} value={currentModel ? currentModel : ""} onValueChange={setCurrentModel}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Models</SelectLabel>
                    {models.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

function useOllamaModels() {
    const [models, setModels] = React.useState<string[]>([]);
    const [currentModel, setCurrentModel] = React.useState<string | undefined>(undefined);
    // Fetch all the models available
    React.useEffect(() => {
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
    React.useEffect(() => {
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
    React.useEffect(() => {
        if (currentModel)
            setOllamaLastModel(currentModel);
    }, [currentModel]);

    return { models, currentModel, setCurrentModel }
}


export function ChatForm() {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [input, setInput] = React.useState<string>("");
    const { models, currentModel, setCurrentModel } = useOllamaModels();
    const { state, dispatch } = useChat();

    const getCurrentConversationId = React.useCallback(async (): Promise<UUID> => {
        let currentConversationId;
        if (state.conversationId === undefined) {
            currentConversationId = await newConversation();
            dispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
            setCurrentConversation(currentConversationId);
        } else {
            if (await db.conversations.get(state.conversationId) !== undefined)
                currentConversationId = state.conversationId;
            else {
                currentConversationId = await newConversation();
                dispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
                setCurrentConversation(currentConversationId);
            }
        }
        return currentConversationId;
    }, [state, dispatch]);


    const appendMessage = React.useCallback(async (message: string): Promise<boolean> => {
        // if there is no model selected or a message is currently displayed
        // then can't append a new message 
        if (currentModel === undefined || state.isStreaming) return false;
        try {
            const currentConversationId = await getCurrentConversationId();
            dispatch({ type: "SET_STREAMING", payload: true });
            // Display the user message
            const userMessage = createUserMessage(message);
            dispatch({ type: "ADD_MESSAGE", payload: userMessage });
            await addMessage(currentConversationId, userMessage);
            // Display an empty message for the assistant
            let assistantId = crypto.randomUUID();
            const assistantMessage = createAssistantMessage("", assistantId);
            dispatch({ type: "SET_ASSISTANT_ANSWER", payload: assistantMessage });
            // Send the user message
            const response = await ollama.chat({
                model: currentModel,
                messages: [...state.messages, userMessage],
                stream: true,
            });
            let accumulateContent = "";
            for await (const chunk of response) {
                accumulateContent += chunk.message.content;
                // Dispaly the assistant message currently streaming
                dispatch({ type: "SET_ASSISTANT_ANSWER", payload: createAssistantMessage(accumulateContent, assistantId) });
            }
            // Update the messages
            const newMessage = createAssistantMessage(accumulateContent, assistantId);
            dispatch({ type: "ADD_MESSAGE", payload: newMessage });
            addMessage(currentConversationId, newMessage);
        } catch (error) {
            console.error("Failed to fetch assistant answer:", error);
        } finally {
            // Remove the streaming message
            dispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
            dispatch({ type: "SET_STREAMING", payload: false });
        }
        return true;
    }, [state, dispatch, currentModel, getCurrentConversationId, input]);

    const submitMessage = React.useCallback(async () => {
        const oldInput = input;
        setInput("");
        const isOk = await appendMessage(input);
        if (!isOk)
            setInput(oldInput);
    }, [appendMessage]);

    const handleSubmit = React.useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submitMessage();
    }, [submitMessage]);


    const handleKeyDown = React.useCallback(async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            await submitMessage();
        }
    }, [submitMessage]);

    const handleFileUpload = () => {
    };

    const handleFileButtonClick = () => {
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[16px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
        >
            <div className="flex w-full items-center">
                <AutoResizeTextarea
                    disabled={state.isStreaming}
                    onKeyDown={handleKeyDown}
                    onChange={(v) => { setInput(v) }}
                    value={input}
                    placeholder="Enter a message"
                    className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <ModelsSelector currentModel={currentModel} setCurrentModel={setCurrentModel} models={models} isStreaming={state.isStreaming} />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            disabled={state.isStreaming}
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
                        <Button disabled={state.isStreaming} variant="ghost" size="sm" className="size-6 rounded-full">
                            <ArrowUpIcon size={16} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={12}>Submit</TooltipContent>
                </Tooltip>
            </div>
        </form>
    );
}
