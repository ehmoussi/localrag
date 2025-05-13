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


export function useAssistantStreaming() {
    const { chatState, chatDispatch } = useChat();
    const workerPoolRef = React.useRef<Map<ConversationID, Worker>>(new Map());
    const { conversationId: currentConversationId } = useParams<{ conversationId: ConversationID }>();

    const getOrCreateWorker = React.useCallback((conversationId: ConversationID): Worker => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker === undefined) {
            console.log(`create a new worker for the conversation ${conversationId}`);
            const newWorker = new Worker({ name: conversationId.toString() });
            workerPoolRef.current.set(conversationId, newWorker);
            return newWorker;
        }
        return worker;
    }, []);

    const setOnMessage = (worker: Worker, conversationId: ConversationID, receiverConversationId: ConversationID | undefined) => {
        if (conversationId === receiverConversationId) {
            worker.onmessage = async function (event: MessageEvent<StreamMessageType>) {
                console.log(`conversationId = ${conversationId}`);
                switch (event.data.type) {
                    case "streaming":
                        // console.log(`Received: ${event.data.payload.content}`);
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
    };

    const updateWorkerOnMessage = (receiverConversationId: ConversationID | undefined) => {
        const workerPool = workerPoolRef.current;
        for (const [conversationId, worker] of workerPool.entries()) {
            setOnMessage(worker, conversationId, receiverConversationId);
        }
    };

    const abortAssistantMessage = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker !== undefined) worker.postMessage({ type: "abort" });
    }, []);

    const streamAssistantMessage = (conversationId: ConversationID, messages: Message[], currentModel: string) => {
        if (!chatState.isStreaming.has(conversationId)) {
            console.log(`get or create the worker for the conversation "${conversationId}"`);
            updateWorkerOnMessage(undefined);
            const worker = getOrCreateWorker(conversationId);
            setOnMessage(worker, conversationId, currentConversationId);
            console.log("start the streaming ")
            chatDispatch({ type: "ADD_CONVERSATION_STREAMING", payload: conversationId });
            worker.postMessage({ type: "initialValues", payload: { conversationId, messages, currentModel } });
        }
    };

    const terminateWorker = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker !== undefined) {
            worker.terminate();
            workerPoolRef.current.delete(conversationId);
        }
    }, []);

    React.useEffect(() => {
        // Clean other workers to avoid the update of the ui from other conversations
        updateWorkerOnMessage(currentConversationId);
    }, [currentConversationId]);

    // Clean the pool of workers when unmounting
    React.useEffect(() => {
        const workerPool = workerPoolRef.current;
        return () => {
            workerPool.forEach((worker) => {
                worker.terminate();
            });
            workerPool.clear();
        };
    }, []);

    return { streamAssistantMessage, abortAssistantMessage, terminateWorker };
}