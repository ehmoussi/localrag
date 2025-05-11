import { AutoResizeTextarea } from "@/AutoResizeTextarea";
import { addAssistantMessage, editMessage, getMessages, getSiblingIds, Message, setUserMessageStatus } from "@/lib/db";
import React, { useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Copy, Pencil } from "lucide-react";
import { useAssistantStreaming } from "./use-assistantstreaming";
import { useModel } from "./use-model";
import { useChat } from "./use-chat";
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { useStreaming } from "./use-streaming";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";



export function AssistantMessage({ message }: { message: Message }) {
    const [isHovering, setIsHovering] = React.useState<boolean>(false);
    return (
        <div className="group flex flex-col"
            onMouseEnter={() => { setIsHovering(true) }}
            onMouseLeave={() => { setIsHovering(false) }}
        >
            <ScrollArea
                className="max-w-[95%] rounded-md shadow-sm px-3 py-2 text-lg whitespace-pre-line self-start border-indigo-100 border text-black"
            >
                {
                    (!message.thinking && !message.content) && <span className="text-sm opacity-70">Thinking ...</span>
                }
                {
                    message.thinking && <ThinkingMessage thinking={message.thinking} />
                }
                <Markdown
                    components={{
                        code(props) {
                            const { children, className, ...rest } = props
                            const match = /language-(\w+)/.exec(className || '')
                            return match ? (<>
                                <SyntaxHighlighter
                                    {...rest}
                                    PreTag="div"
                                    children={String(children).replace(/\n$/, '')}
                                    language={match[1]}
                                />
                                <button
                                    className="p-1 rounded hover:bg-black/10"
                                    aria-label="Copy code snippet"
                                    onClick={() => { navigator.clipboard.writeText(String(children)) }}
                                >
                                    <Copy size={12} />
                                </button></>
                            ) : (
                                <code {...rest} className={className}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {message.content}
                </Markdown>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="flex gap-1 justify-start mt-1 opacity-70"
                style={{ visibility: isHovering ? 'visible' : 'hidden' }}>
                <button
                    className="p-1 rounded hover:bg-black/10"
                    aria-label="Copy message"
                >
                    <Copy size={16} />
                </button>
            </div>
        </div >
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
            <UserMessageDisplay message={message} onClickEdit={() => setIsEditing((e) => !e)} />
        );
}


function UserMessageDisplay({ message, onClickEdit }: { message: Message, onClickEdit: () => void }) {
    const [isHovering, setIsHovering] = React.useState<boolean>(false);
    const { isStreaming } = useStreaming();
    return (
        <div className="group flex flex-col"
            onMouseEnter={() => { setIsHovering(!isStreaming) }}
            onMouseLeave={() => { setIsHovering(false) }}
        >
            <div
                data-role={message.role}
                className="max-w-[80%] rounded-lg px-3 py-2 text-lg whitespace-pre-line self-end bg-blue-500 text-white"
            >
                {message.content}
            </div>

            <div
                className="flex gap-1 justify-end mt-1 opacity-70"
                style={{ visibility: isHovering ? 'visible' : 'hidden' }}>
                <button
                    onClick={() => { navigator.clipboard.writeText(message.content) }}
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
                <MessagePagination message={message} />
            </div>
        </div>
    );
}

function UserMessageEditing({ message, setIsEditing }: { message: Message, setIsEditing: (isEditing: boolean) => void }) {
    const [input, setInput] = React.useState(message.content);
    const { chatDispatch } = useChat();
    const { streamAssistantMessage } = useAssistantStreaming();
    const { modelState } = useModel();
    const { setStreaming } = useStreaming();

    async function submitMessage() {
        setIsEditing(false);
        if (modelState.currentModel !== undefined) {
            const userMessage = await editMessage(message.conversationId, message.id, input);
            if (userMessage !== undefined) {
                // Update the messages because the children of the user message are not the same anymore
                const newMessages = await getMessages(message.conversationId);
                chatDispatch({ type: "SET_MESSAGES", payload: newMessages });
                setStreaming(true);
                streamAssistantMessage(
                    message.conversationId,
                    newMessages,
                    modelState.currentModel,
                    async (assistantMessage: Message) => {
                        // Update the last message
                        chatDispatch({ type: "ADD_MESSAGE", payload: assistantMessage });
                        await addAssistantMessage(userMessage.conversationId, assistantMessage);
                        setStreaming(false);
                    }
                );
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
                        className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none p-3 rounded-lg border border-blue-500 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none min-h-[40px] text-lg"
                    />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="text-lg px-3 py-1 h-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-blue-500 text-lg hover:bg-black text-white px-3 py-1 h-auto"
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}


function MessagePagination({ message }: { message: Message }) {
    const [currentPage, setCurrentPage] = React.useState<number | undefined>();
    const [nbPages, setNbPages] = React.useState<number | undefined>(1);
    const { chatDispatch } = useChat();

    useEffect(() => {
        let isMounted = true;
        async function updatePage() {
            if (isMounted) {
                const siblings = await getSiblingIds(message.conversationId, message.id);
                const nbSiblings = siblings.length;
                if (nbSiblings > 1) {
                    const index = siblings.findIndex((s) => s === message.id);
                    setCurrentPage(index + 1);
                    setNbPages(nbSiblings);
                } else {
                    setCurrentPage(undefined);
                    setNbPages(undefined);
                }
            }
        }
        updatePage();
        return () => {
            isMounted = false;
        }
    }, [message]);

    const moveToPreviousMessage = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const siblingIds = await getSiblingIds(message.conversationId, message.id);
        for (const [index, siblingId] of siblingIds.entries()) {
            if (siblingId === message.id && index > 0) {
                await setUserMessageStatus(siblingId, false);
                await setUserMessageStatus(siblingIds[index - 1], true);
                setCurrentPage(index);
                chatDispatch({ type: "SET_MESSAGES", payload: await getMessages(message.conversationId) });
            }
        }
    };

    const moveToNextMessage = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const siblingIds = await getSiblingIds(message.conversationId, message.id);
        for (const [index, siblingId] of siblingIds.entries()) {
            if (siblingId === message.id && index < (siblingIds.length - 1)) {
                await setUserMessageStatus(siblingId, false);
                await setUserMessageStatus(siblingIds[index + 1], true);
                setCurrentPage(index);
                chatDispatch({ type: "SET_MESSAGES", payload: await getMessages(message.conversationId) });
            }
        }
    };

    return (
        <>
            {
                currentPage !== undefined && nbPages !== undefined && (
                    <>
                        <button
                            onClick={moveToPreviousMessage}
                            className="p-1 rounded hover:bg-black/10"
                            aria-label="Previous message">
                            <ChevronLeft size={16} />
                        </button>
                        <span>{currentPage} / {nbPages}</span>
                        <button
                            onClick={moveToNextMessage}
                            className="p-1 rounded hover:bg-black/10"
                            aria-label="Next message">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )
            }
        </>
    );
}

export function ThinkingMessage({ thinking }: { thinking: string }) {
    const [isOpen, setIsOpen] = React.useState<boolean>(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="opacity-60">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                    <ChevronsUpDown size={6} />
                    <span className="text-sm">Thinking ...</span>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="max-w-[80%] rounded-md px-4 pb-6 self-start border-black-100 border text-sm">
                {thinking}
            </CollapsibleContent>
        </Collapsible >
    );
}
