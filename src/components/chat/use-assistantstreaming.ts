import { setDocumentTitle } from "@/lib/utils";
import { useChat } from "./use-chat";
import { ConversationID, Message } from "@/lib/db";
import Worker from "@/lib/worker?worker"
import React from "react";
import { useParams } from "react-router";

type StreamMessageType =
    { type: "streaming", conversationId: ConversationID, payload: Message }
    | { type: "title", conversationId: ConversationID, payload: string }
    | { type: "completed", conversationId: ConversationID, payload: Message };

export const WorkerPoolContext = React.createContext<Map<ConversationID, Worker> | undefined>(undefined);

export function useAssistantStreaming() {
    const { chatState, chatDispatch } = useChat();
    const workerPool = React.useContext(WorkerPoolContext);
    const { conversationId: currentConversationId } = useParams<{ conversationId: ConversationID }>();

    if (workerPool === undefined) throw new Error("useAssistantStreaming can't be used outside a WorkerPoolProvider");

    const getOrCreateWorker = React.useCallback((conversationId: ConversationID): Worker => {
        const worker = workerPool.get(conversationId);
        if (worker === undefined) {
            const newWorker = new Worker({ name: conversationId.toString() });
            workerPool.set(conversationId, newWorker);
            return newWorker;
        }
        return worker;
    }, [workerPool]);

    const setOnMessage = React.useCallback((worker: Worker, conversationId: ConversationID, receiverConversationId: ConversationID | undefined) => {
        if (conversationId === receiverConversationId) {
            worker.onmessage = async function (event: MessageEvent<StreamMessageType>) {
                switch (event.data.type) {
                    case "streaming":
                        chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: event.data.payload });
                        break;
                    case "title": {
                        const title = event.data.payload;
                        // TODO: Update the title in the conversation component
                        setDocumentTitle(title);
                        break;
                    }
                    case "completed": {
                        const assistantMessage = event.data.payload;
                        chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
                        chatDispatch({ type: "ADD_MESSAGE", payload: assistantMessage });
                        chatDispatch({ type: "REMOVE_CONVERSATION_STREAMING", payload: conversationId });
                        break;
                    }
                };
            }
        } else {
            worker.onmessage = async function (event: MessageEvent<StreamMessageType>) {
                switch (event.data.type) {
                    case "completed": {
                        chatDispatch({ type: "REMOVE_CONVERSATION_STREAMING", payload: conversationId });
                        break;
                    }
                };
            }
        }
    }, [chatDispatch]);

    const updateWorkerOnMessage = React.useCallback((receiverConversationId: ConversationID | undefined) => {
        for (const [conversationId, worker] of workerPool.entries()) {
            setOnMessage(worker, conversationId, receiverConversationId);
        }
    }, [workerPool, setOnMessage]);

    const abortAssistantMessage = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPool.get(conversationId);
        if (worker !== undefined) worker.postMessage({ type: "abort" });
    }, [workerPool]);

    const streamAssistantMessage = React.useCallback(
        (conversationId: ConversationID, messages: Message[], currentModel: string) => {
            if (!chatState.isStreaming.has(conversationId)) {
                // Clean other workers to avoid the update of the ui from other conversations
                updateWorkerOnMessage(undefined);
                const worker = getOrCreateWorker(conversationId);
                // Set the onMessage callback for the current conversation
                setOnMessage(worker, conversationId, currentConversationId);
                // Start the streaming
                chatDispatch({ type: "ADD_CONVERSATION_STREAMING", payload: conversationId });
                worker.postMessage({ type: "initialValues", payload: { conversationId, messages, currentModel } });
            }
        }, [
        updateWorkerOnMessage,
        getOrCreateWorker,
        setOnMessage,
        currentConversationId,
        chatState.isStreaming,
        chatDispatch
    ]);

    const terminateWorker = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPool.get(conversationId);
        if (worker !== undefined) {
            worker.terminate();
            workerPool.delete(conversationId);
        }
    }, [workerPool]);

    React.useEffect(() => {
        // Clean other workers to avoid the update of the ui from other conversations
        updateWorkerOnMessage(currentConversationId);
    }, [currentConversationId, updateWorkerOnMessage]);

    return { streamAssistantMessage, abortAssistantMessage, terminateWorker };
}