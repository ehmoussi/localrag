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



export function ChatForm({ conversationId }: { conversationId: ConversationID | undefined }) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [input, setInput] = React.useState<string>("");
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

    const submitMessage = async (currentConversationId: ConversationID) => {
        // If the input is empty get the message from the local storage
        // or if there is no model selected 
        // or if an answer is currently streaming
        // then can't submit a new message 
        if (input === ""
            || modelState.currentModel === undefined
            || chatState.isStreaming.has(currentConversationId)
        ) return;
        // Clean the user message before starting to stream
        setInput("");
        // Display the user message
        const userMessage = createMessage(currentConversationId, "user", input);
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
        let currentConversationId = conversationId;
        if (currentConversationId === undefined) {
            currentConversationId = await createNewConversation();
        }
        if (!chatState.isStreaming.has(currentConversationId)) {
            await submitMessage(currentConversationId);
        } else {
            abortAssistantMessage(currentConversationId);
        }
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            let currentConversationId = conversationId;
            if (currentConversationId === undefined) currentConversationId = await createNewConversation();
            await submitMessage(currentConversationId);
        }
    };

    const handleFileUpload = () => {
    };

    const handleFileButtonClick = () => {
    };

    const isDisabled = conversationId !== undefined && chatState.isStreaming.has(conversationId);

    return (
        <form
            onSubmit={handleSubmit}
            className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[10px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
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
        </form>
    );
}
