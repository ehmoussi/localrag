import React from "react";
import { ConversationID, getConversation, getMessages, Message } from "../../lib/db";
import { useChat } from "./use-chat";
import { AssistantMessage, UserMessage } from "./ChatMessage";
import { setDocumentTitle } from "@/lib/utils";

const MessageComp = React.memo(function MessageComp({ message }: { message: Message }) {
    if (message.role == "user")
        return <UserMessage message={message} />
    else
        return <AssistantMessage message={message} />
});


function AnswerMessage({ conversationId }: { conversationId: ConversationID }) {
    const bottomRef = React.useRef<HTMLDivElement | null>(null);
    const { chatState } = useChat();

    React.useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chatState.assistantAnswer]);

    return (
        <>
            {
                (chatState.assistantAnswer !== undefined && chatState.assistantAnswer.conversationId === conversationId) ?
                    <><AssistantMessage message={chatState.assistantAnswer} /><div ref={bottomRef}></div></>
                    : undefined
            }
        </>
    );
}


export function ChatMessages({ conversationId }: { conversationId: ConversationID }) {
    const { chatState, chatDispatch } = useChat();

    React.useEffect(() => {
        let isMounted = true;

        const updateMessages = async () => {
            if (isMounted) {
                let title = "";
                if (conversationId !== undefined) {
                    const messages = await getMessages(conversationId);
                    chatDispatch({ type: "SET_MESSAGES", payload: messages });
                    const conversation = await getConversation(conversationId);
                    if (conversation !== undefined)
                        title = conversation.title;
                } else {
                    chatDispatch({ type: "SET_MESSAGES", payload: [] });
                }
                setDocumentTitle(title);
            }
        }
        updateMessages();

        return () => {
            isMounted = false;
        }
    }, [conversationId, chatDispatch]);

    return (
        <div className="flex-1 content-center overflow-y-auto px-6">
            {
                chatState.messages.length > 0 &&
                <div className="my-4 flex h-fit min-h-full flex-col gap-4">
                    {
                        chatState.messages.map((message) => (
                            <MessageComp key={message.id} message={message} />
                        ))
                    }
                    <AnswerMessage conversationId={conversationId} />
                </div>
            }
        </div>
    );
}
