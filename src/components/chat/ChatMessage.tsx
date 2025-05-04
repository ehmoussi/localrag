import { AutoResizeTextarea } from "@/AutoResizeTextarea";
import { addAssistantMessage, editMessage, getMessages, Message } from "@/lib/db";
import React from "react";
import { Button } from "../ui/button";
import { Copy, Pencil } from "lucide-react";
import { useAssistantStreaming } from "./use-assistantstreaming";
import { useModel } from "./use-model";
import { useChat } from "./use-chat";


export function AssistantMessage({ message }: { message: Message }) {
    const [isHovering, setIsHovering] = React.useState<boolean>(false);
    return (
        <div className="group flex flex-col"
            onMouseEnter={() => { setIsHovering(true) }}
            onMouseLeave={() => { setIsHovering(false) }}
        >
            <div
                className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line self-start bg-gray-100 text-black"
            >
                {message.content}
            </div>
            <div
                className="flex gap-1 justify-start mt-1 opacity-70"
                style={{ visibility: isHovering ? 'visible' : 'hidden' }}>
                <button
                    className="p-1 rounded hover:bg-black/10"
                    aria-label="Copy message"
                >
                    <Copy size={16} />
                </button>
            </div>
        </div>
    );
}


export function UserMessage({ message }: { message: Message }) {
    const [isEditing, setIsEditing] = React.useState(false);
    if (isEditing)
        return (
            <UserMessageEditing message={message} setIsEditing={setIsEditing} />
        );
    else
        return (
            <UserMessageDisplay message={message} onClickEdit={() => setIsEditing(!isEditing)} />
        );
}


function UserMessageDisplay({ message, onClickEdit }: { message: Message, onClickEdit: () => void }) {
    const [isHovering, setIsHovering] = React.useState<boolean>(false);
    return (
        <div className="group flex flex-col"
            onMouseEnter={() => { setIsHovering(true) }}
            onMouseLeave={() => { setIsHovering(false) }}
        >
            <div
                data-role={message.role}
                className="max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line self-end bg-blue-500 text-white"
            >
                {message.content}
            </div>

            <div
                className="flex gap-1 justify-end mt-1 opacity-70"
                style={{ visibility: isHovering ? 'visible' : 'hidden' }}>
                <button
                    className="p-1 rounded hover:bg-black/10"
                    aria-label="Copy message"
                >
                    <Copy size={16} />
                </button>
                <button
                    onClick={onClickEdit}
                    className="p-1 rounded hover:bg-black/10"
                    aria-label="Edit message"
                >
                    <Pencil size={16} />
                </button>
            </div>
        </div>
    );
}

function UserMessageEditing({ message, setIsEditing }: { message: Message, setIsEditing: (isEditing: boolean) => void }) {
    const [input, setInput] = React.useState(message.content);
    const { chatDispatch } = useChat();
    const { streamAssistantMessage } = useAssistantStreaming();
    const { modelState } = useModel();

    async function submitMessage() {
        // TODO: add the editing of the message
        setIsEditing(false);
        if (modelState.currentModel !== undefined) {
            const userMessage = await editMessage(message.conversationId, message.id, input);
            if (userMessage !== undefined) {
                // Update the messages because the children of the user message are not the same anymore
                const newMessages = await getMessages(message.conversationId);
                chatDispatch({ type: "SET_MESSAGES", payload: newMessages });
                const assistantMessage = await streamAssistantMessage(message.conversationId, userMessage, modelState.currentModel);
                if (assistantMessage !== undefined) {
                    // Update the last message
                    addAssistantMessage(userMessage.conversationId, assistantMessage);
                    chatDispatch({ type: "ADD_MESSAGE", payload: assistantMessage });
                }
            } else {
                console.error("Failed to create the user message");
            }
        } else {
            console.error("No model have been selected");
        }
    }

    function handleCancel() {
        setInput(message.content);
        setIsEditing(false);
    }

    function handleSubmit(e: React.FormEvent<HTMLButtonElement>) {
        e.preventDefault();
        submitMessage();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.ctrlKey && e.key == "Enter") {
            submitMessage();
        }
    }

    return (
        <div className="group flex flex-col">
            <div>
                <div className="flex w-full items-center">
                    <AutoResizeTextarea
                        onKeyDown={handleKeyDown}
                        onChange={(v) => { setInput(v) }}
                        value={input}
                        placeholder="Enter a message"
                        className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none p-3 rounded-xl border border-blue-500 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none min-h-[40px] text-sm"
                    />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="text-sm px-3 py-1 h-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-blue-500 text-sm hover:bg-black text-white px-3 py-1 h-auto"
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}


