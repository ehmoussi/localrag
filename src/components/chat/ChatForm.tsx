import React from "react";
import { useChat } from "./use-chat";
import { addAssistantMessage, addUserMessage, ConversationID, createMessage, getConversation, Message, newConversation, updateConversationTitle } from "../../lib/db";
import { setCurrentConversation } from "../../lib/storage";
import ollama from 'ollama';
import { AutoResizeTextarea } from "../../AutoResizeTextarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ArrowUpIcon, CircleStopIcon, PaperclipIcon } from "lucide-react";
import { useModel } from "./use-model";
import { ChatModelSelector } from "./ChatModelSelector";
import { useStreaming } from "./use-streaming";
import { useAssistantStreaming } from "./use-assistantstreaming";



async function generateConversationTitle(currentModel: string, messages: Message[]): Promise<string> {
    try {
        let conversationText = "";
        messages.forEach(msg => {
            conversationText += `${msg.role}: ${msg.content}\n\n`;
        });
        const prompt = (
            "Based on the conversation below, generate a short, descriptive title (5 words or less). "
            + "- Respond with ONLY the title text\n"
            + "- No additional explanation\n"
            + "- No quotes\n"
            + "- Answer with the same language as the conversation.\n\n"
            + conversationText + "\n\n"
        );
        console.log(prompt);
        const response = await ollama.generate({
            model: currentModel,
            prompt: prompt,
            stream: false, // TODO: replace by true
            options: {
                temperature: 0.3 // Lower for more consistent titles
            }
        });
        const title = response.response.trim();//.replace(/^["']|["']$/g, '');
        console.log(title);
        return title;
    } catch {
        return "New Conversation";
    }
}


export function ChatForm() {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [input, setInput] = React.useState<string>("");
    const { chatState, chatDispatch } = useChat();
    const { isStreaming, setStreaming } = useStreaming();
    const { modelState } = useModel();
    const { streamAssistantMessage } = useAssistantStreaming();

    const getCurrentConversationId = React.useCallback(async (): Promise<ConversationID> => {
        let currentConversationId;
        if (chatState.conversationId === undefined) {
            currentConversationId = await newConversation();
            chatDispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
            setCurrentConversation(currentConversationId);
        } else {
            if (await getConversation(chatState.conversationId) !== undefined)
                currentConversationId = chatState.conversationId;
            else {
                currentConversationId = await newConversation();
                chatDispatch({ type: "SET_CONVERSATION", payload: currentConversationId });
                setCurrentConversation(currentConversationId);
            }
        }
        return currentConversationId;
    }, [chatState.conversationId, chatDispatch]);

    const submitMessage = async () => {
        if (input !== "") {
            // if there is no model selected or a message is currently displayed
            // then can't append a new message 
            if (modelState.currentModel === undefined || isStreaming) return;
            const currentConversationId = await getCurrentConversationId();
            setInput("");
            setStreaming(true);
            // Display the user message
            const userMessage = createMessage(currentConversationId, "user", input);
            chatDispatch({ type: "ADD_MESSAGE", payload: userMessage });
            await addUserMessage(currentConversationId, userMessage);
            const assistantMessage = await streamAssistantMessage(currentConversationId, userMessage, modelState.currentModel);
            // Update the last message displayed
            // NOTE: the update should be put just after to avoid flashing the user when answer message and real message are substitued
            chatDispatch({ type: "ADD_MESSAGE", payload: assistantMessage });
            // Update the title
            if (chatState.messages.length === 0) {
                const title = await generateConversationTitle(modelState.currentModel, [...chatState.messages, userMessage, assistantMessage]);
                await updateConversationTitle(currentConversationId, title);
            }
            // Update the messages in the db
            await addAssistantMessage(currentConversationId, assistantMessage);
            setStreaming(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isStreaming)
            await submitMessage();
        else
            ollama.abort();
    };

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            await submitMessage();
        }
    };

    const handleFileUpload = () => {
    };

    const handleFileButtonClick = () => {
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border-input bg-background focus-within:ring-ring/10 relative mx-6 mb-6 flex flex-col items-center rounded-[10px] border px-3 py-1.5 pr-8 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0"
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
                        <Button variant="ghost" size="sm" className="size-6 rounded-full">
                            {
                                isStreaming ?
                                    <CircleStopIcon size={24} /> :
                                    <ArrowUpIcon size={24} />
                            }
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={12}>{isStreaming ? "Abort" : "Submit"}</TooltipContent>
                </Tooltip>
            </div>
        </form>
    );
}
