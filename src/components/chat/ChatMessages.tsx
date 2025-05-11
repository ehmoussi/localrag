import React from "react";
import { ConversationID, getConversation, getMessages, Message } from "../../lib/db";
import { useChat } from "./use-chat";
import { AssistantMessage, UserMessage } from "./ChatMessage";
import { useParams } from "react-router";
import { setDocumentTitle } from "@/lib/utils";

function Header() {
    return (
        <header className="m-auto flex max-w-96 flex-col gap-5 text-center">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">AI Chatbot With RAG</h1>
            <p className="text-muted-foreground text-sm">
                Connect an API Key from your provider and send a message to get started or use a local model by installing <a className="underline" href="https://ollama.com/download">Ollama</a>.
            </p>
        </header>
    );
}

const MessageComp = React.memo(function MessageComp({ message }: { message: Message }) {
    if (message.role == "user")
        return <UserMessage message={message} />
    else
        return <AssistantMessage message={message} />
});


function AnswerMessage() {
    const bottomRef = React.useRef<HTMLDivElement | null>(null);
    const { chatState } = useChat();
    const { conversationId } = useParams<{ conversationId: ConversationID }>();

    React.useEffect(() => {
        if (bottomRef.current)
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chatState.assistantAnswer]);

    return (
        <>
            {
                (chatState.assistantAnswer && chatState.assistantAnswer.conversationId == conversationId) ?
                    <>< AssistantMessage message={chatState.assistantAnswer} /><div ref={bottomRef}></div></>
                    : undefined
            }
        </>
    );
}


export function ChatMessages() {
    const { chatState, chatDispatch } = useChat();
    const { conversationId } = useParams<{ conversationId: ConversationID }>();
    console.log(`conversationId = ${conversationId}`);

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
                chatState.messages.length ?
                    <div className="my-4 flex h-fit min-h-full flex-col gap-4">
                        {
                            chatState.messages.map((message) => (
                                <MessageComp key={message.id} message={message} />
                            ))
                        }
                        <AnswerMessage />
                    </div> :
                    <Header />
            }
        </div>
    );
}
