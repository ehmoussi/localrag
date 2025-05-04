import { AutoResizeTextarea } from "@/AutoResizeTextarea";
import { Message } from "@/lib/db";
import React from "react";
import { Button } from "../ui/button";
import { Copy, Pencil } from "lucide-react";


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

    function handleSubmission() {
        // TODO: add the editing of the message
        setIsEditing(false);
    }

    function cancelSubmission() {
        setInput(message.content);
        setIsEditing(false);
    }

    return (
        <div className="group flex flex-col">
            <div>
                <div className="flex w-full items-center">
                    <AutoResizeTextarea
                        onKeyDown={handleSubmission}
                        onChange={(v) => { setInput(v) }}
                        value={input}
                        placeholder="Enter a message"
                        className="placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none p-3 rounded-xl border border-blue-500 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none min-h-[40px] text-sm"
                    />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <Button
                        variant="ghost"
                        onClick={cancelSubmission}
                        className="text-sm px-3 py-1 h-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmission}
                        className="bg-blue-500 text-sm hover:bg-black text-white px-3 py-1 h-auto"
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}