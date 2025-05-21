import React from "react";
import { useChat } from "./use-chat";
import { addUserMessage, ConversationID, createMessage, newConversation } from "../../lib/db";
import { setCurrentConversation } from "../../lib/storage";
import { AutoResizeTextarea } from "../../AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ArrowUpIcon, CircleStopIcon, PaperclipIcon } from "lucide-react";
import { useModel } from "./use-model";
import { ChatModelSelector } from "./ChatModelSelector";
import { useAssistantStreaming } from "./use-assistantstreaming";
import { useNavigate } from "react-router";
import { transformFilesToXmlContent } from "@/lib/filecontent";
import { ChatFileTags } from "./ChatFileTags";



export function ChatForm({ conversationId }: { conversationId: ConversationID | undefined }) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [input, setInput] = React.useState<string>("");
    const [inputFiles, setInputFiles] = React.useState<File[]>([]);
    const { chatState, chatDispatch } = useChat();
    const { modelState } = useModel();
    const { streamAssistantMessage, abortAssistantMessage } = useAssistantStreaming();
    const navigate = useNavigate();

    const createNewConversation = React.useCallback(async (): Promise<ConversationID> => {
        const newConversationId = await newConversation();
        navigate(`/${newConversationId}`);
        setCurrentConversation(newConversationId);
        return newConversationId;
    }, [navigate]);

    const submitMessage = async () => {
        // if an answer is currently streaming then can't submit a new message
        if (
            (input === "" && inputFiles.length === 0)
            || (modelState.currentModel === undefined)
            || (conversationId !== undefined && chatState.isStreaming.has(conversationId))
        ) return;
        let currentConversationId = conversationId;
        if (currentConversationId === undefined) currentConversationId = await createNewConversation();
        const files = { metadata: inputFiles, content: await transformFilesToXmlContent(inputFiles) };
        // Clean the user message before starting to stream
        setInput("");
        setInputFiles([]);
        // Display the user message
        const userMessage = createMessage(currentConversationId, "user", input, files);
        chatDispatch({ type: "ADD_MESSAGE", payload: userMessage });
        await addUserMessage(currentConversationId, userMessage);
        streamAssistantMessage(
            currentConversationId,
            [...chatState.messages, userMessage],
            modelState.currentModel,
        );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (conversationId === undefined || !chatState.isStreaming.has(conversationId)) {
            await submitMessage();
        } else {
            abortAssistantMessage(conversationId);
        }
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            await submitMessage();
        }
    };

    const handleFileUpload = async (event: React.FormEvent<HTMLInputElement>) => {
        const files = (event.target as HTMLInputElement).files;
        if (files !== null)
            setInputFiles([...inputFiles, ...Array.from(files)]);
    };

    const handleFileRemoved = (filename: string) => {
        setInputFiles(inputFiles.filter((f) => f.name !== filename));
    };

    const handleFileButtonClick = () => {
        if (fileInputRef.current !== null)
            fileInputRef.current.click();
    };

    const isDisabled = conversationId !== undefined && chatState.isStreaming.has(conversationId);

    return (
        <form
            onSubmit={handleSubmit}
            className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-start rounded-[10px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
        >
            <div className="flex w-full items-center">
                <AutoResizeTextarea
                    disabled={isDisabled}
                    onKeyDown={handleKeyDown}
                    onChange={(v) => { setInput(v) }}
                    value={input}
                    placeholder="Enter a message"
                    className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <ChatModelSelector isDisabled={isDisabled} />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            disabled={isDisabled}
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
                        <Button variant="ghost" size="sm" className="size-6 rounded-full">
                            {
                                isDisabled ?
                                    <CircleStopIcon size={24} /> :
                                    <ArrowUpIcon size={24} />
                            }
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={12}>{isDisabled ? "Abort" : "Submit"}</TooltipContent>
                </Tooltip>
            </div>
            <ChatFileTags files={inputFiles} onRemove={handleFileRemoved} />
            {/* <div className="w-full flex flex-wrap gap-2 mb-3">
                {
                    inputFiles.map((f) => {
                        return (
                            <FileTag key={f.name} filename={f.name} onRemove={() => handleFileRemoved(f.name)} />
                        );
                    })
                }
            </div> */}
        </form>
    );
}
