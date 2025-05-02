import React from "react";
import { useChat } from "./use-chat";
import { addMessage, createAssistantMessage, createUserMessage, db, newConversation } from "../../lib/db";
import { setCurrentConversation } from "../../lib/storage";
import ollama from 'ollama';
import { AutoResizeTextarea } from "../../AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";
import { UUID } from "crypto";
import { useModel } from "./use-model";
import { ChatModelSelector } from "./ChatModelSelector";
import { useStreaming } from "./use-streaming";


const BUFFER_STREAMING_SIZE: number = 40;


export function ChatForm() {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [input, setInput] = React.useState<string>("");
    const { chatState, chatDispatch } = useChat();
    const { isStreaming, setStreaming } = useStreaming();
    const { modelState } = useModel();

    const getCurrentConversationId = React.useCallback(async (): Promise<UUID> => {
        let currentConversationId;
        if (chatState.conversationId === undefined) {
            currentConversationId = await newConversation();
            chatDispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
            setCurrentConversation(currentConversationId);
        } else {
            if (await db.conversations.get(chatState.conversationId) !== undefined)
                currentConversationId = chatState.conversationId;
            else {
                currentConversationId = await newConversation();
                chatDispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
                setCurrentConversation(currentConversationId);
            }
        }
        return currentConversationId;
    }, [chatState, chatDispatch]);


    const appendMessage = React.useCallback(async (message: string): Promise<boolean> => {
        // if there is no model selected or a message is currently displayed
        // then can't append a new message 
        if (modelState.currentModel === undefined || isStreaming) return false;
        try {
            const currentConversationId = await getCurrentConversationId();
            setStreaming(true);
            // Display the user message
            const userMessage = createUserMessage(currentConversationId, message);
            chatDispatch({ type: "ADD_MESSAGE", payload: userMessage });
            await addMessage(currentConversationId, userMessage);
            // Display an empty message for the assistant
            let assistantId = crypto.randomUUID();
            const assistantMessage = createAssistantMessage(currentConversationId, "", assistantId);
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: assistantMessage });
            // Send the user message
            const response = await ollama.chat({
                model: modelState.currentModel,
                messages: [...chatState.messages, userMessage],
                stream: true,
            });
            let accumulateContent = "";
            let buffer = "";
            for await (const chunk of response) {
                buffer += chunk.message.content;
                // Dispaly the assistant message currently streaming
                if (buffer.length > BUFFER_STREAMING_SIZE) {
                    accumulateContent += buffer;
                    chatDispatch({
                        type: "SET_ASSISTANT_ANSWER",
                        payload: createAssistantMessage(currentConversationId, accumulateContent, assistantId)
                    });
                    buffer = "";
                }
            }
            if (buffer.length > 0) {
                accumulateContent += buffer;
                // Dispaly the assistant message currently streaming
                chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: createAssistantMessage(currentConversationId, accumulateContent, assistantId) });
            }
            // Update the messages
            const newMessage = createAssistantMessage(currentConversationId, accumulateContent, assistantId);
            chatDispatch({ type: "ADD_MESSAGE", payload: newMessage });
            addMessage(currentConversationId, newMessage);
        } catch (error) {
            console.error("Failed to fetch assistant answer:", error);
        } finally {
            // Remove the streaming message
            chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
            setStreaming(false);
        }
        return true;
    }, [chatState, chatDispatch, modelState, getCurrentConversationId, isStreaming, setStreaming]);

    const submitMessage = React.useCallback(async () => {
        const oldInput = input;
        setInput("");
        const isOk = await appendMessage(input);
        if (!isOk)
            setInput(oldInput);
    }, [appendMessage, input, setInput]);

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
                    disabled={isStreaming}
                    onKeyDown={handleKeyDown}
                    onChange={(v) => { setInput(v) }}
                    value={input}
                    placeholder="Enter a message"
                    className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
                />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <ChatModelSelector />
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
    );
}
