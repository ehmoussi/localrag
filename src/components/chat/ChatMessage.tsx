import { AutoResizeTextarea } from "@/AutoResizeTextarea";
import { ConversationID, editMessage, getMessages, getSiblingIds, Message, setUserMessageStatus } from "@/lib/db";
import React, { useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Copy, Pencil } from "lucide-react";
import { useAssistantStreaming } from "./use-assistantstreaming";
import { useModel } from "./use-model";
import { useChat } from "./use-chat";
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useParams } from "react-router";
import { ChatFileTags } from "./ChatFileTags";
import { transformFilesToXmlContent } from "@/lib/filecontent";


export function MarkdownMessage({ message }: { message: string }) {
    return (
        <Markdown
            components={{
                code(props) {
                    const { children, className, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                        <div>
                            <SyntaxHighlighter
                                {...rest}
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                ref={null}
                                style={undefined}
                            />
                            <button
                                className="p-1 rounded hover:bg-black/10"
                                aria-label="Copy code snippet"
                                onClick={() => { navigator.clipboard.writeText(String(children)) }}
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    ) : (
                        <code {...rest} className={className}>
                            {children}
                        </code>
                    )
                }
            }}
        >
            {message}
        </Markdown>
    );
}


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
                    (!message.thinking && !message.content.message) && <span className="text-sm opacity-70">Thinking ...</span>
                }
                {
                    message.thinking && <ThinkingMessage thinking={message.thinking} />
                }
                <MarkdownMessage message={message.content.message} />
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div
                onClick={() => navigator.clipboard.writeText(message.content.message)}
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
        return <UserMessageEditing message={message} setIsEditing={setIsEditing} />;
    else
        return <UserMessageDisplay message={message} onClickEdit={() => setIsEditing((e) => !e)} />;
}


function UserMessageDisplay({ message, onClickEdit }: { message: Message, onClickEdit: () => void }) {
    const [isHovering, setIsHovering] = React.useState<boolean>(false);
    const { chatState } = useChat();
    const isDisabled = chatState.isStreaming.has(message.conversationId);
    return (
        <div className="group flex flex-col"
            onMouseEnter={() => { setIsHovering(!isDisabled) }}
            onMouseLeave={() => { setIsHovering(false) }}
        >
            <div
                data-role={message.role}
                className="max-w-[95%] rounded-lg px-3 py-2 text-lg whitespace-pre-line self-end border border-neutral-500 bg-neutral-50 text-black"
            >
                <MarkdownMessage message={message.content.message} />
                <ChatFileTags files={message.content.files.metadata} onRemove={undefined} />
            </div>

            <div
                className="flex gap-1 justify-end mt-1 opacity-70"
                style={{ visibility: isHovering ? 'visible' : 'hidden' }}>
                <button
                    onClick={() => { navigator.clipboard.writeText(message.content.message) }}
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
    const { conversationId } = useParams<{ conversationId: ConversationID }>();
    const [input, setInput] = React.useState(message.content.message);
    const [inputFiles, setInputFiles] = React.useState<File[]>([]);
    const { chatDispatch } = useChat();
    const { streamAssistantMessage } = useAssistantStreaming();
    const { modelState } = useModel();

    async function submitMessage() {
        setIsEditing(false);
        if (modelState.currentModel !== undefined && conversationId !== undefined) {
            const files = { metadata: inputFiles, content: await transformFilesToXmlContent(inputFiles) };
            const userMessage = await editMessage(
                conversationId, message.id, input, files
            );
            if (userMessage !== undefined) {
                // Update the messages because the children of the user message are not the same anymore
                const newMessages = await getMessages(conversationId);
                chatDispatch({ type: "SET_MESSAGES", payload: newMessages });
                streamAssistantMessage(
                    conversationId,
                    newMessages,
                    modelState.currentModel
                );
            } else {
                console.error("Failed to create the user message");
            }
        } else {
            console.error("No model have been selected");
        }
    }

    function handleCancel() {
        setInput(message.content.message);
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

    const handleFileRemoved = (filename: string) => {
        setInputFiles(inputFiles.filter((f) => f.name !== filename));
    };

    React.useEffect(() => {
        setInputFiles(message.content.files.metadata);
    }, [message]);

    return (
        <div className="group flex flex-col">
            <div
                className="border-input bg-background  relative mx-6 mb-6 flex flex-col items-start rounded-[10px] border px-3 py-1.5 pr-8 text-sm"
            >
                <div className="flex w-full items-center">
                    <AutoResizeTextarea
                        onKeyDown={handleKeyDown}
                        onChange={(v) => { setInput(v) }}
                        value={input}
                        placeholder="Enter a message"
                        className="placeholder:text-muted-foreground flex-1 bg-transparent border border-neutral-500 focus:outline-none p-3 rounded-lg focus:ring-3 focus:ring-neutral-500 focus:border-transparent transition-all resize-none min-h-[40px] text-lg"
                    />
                </div>
                <div className="flex flex-col justify-end gap-2 mt-2 w-full">
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
                            className="bg-neutral-500 text-lg hover:bg-black text-white px-3 py-1 h-auto"
                        >
                            Submit
                        </Button>
                    </div>
                    <ChatFileTags files={inputFiles} onRemove={handleFileRemoved} />
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
