import { useChat } from "./use-chat";
import { ConversationID, Message } from "@/lib/db";
import Worker from "@/lib/worker?worker"
import React from "react";

type StreamMessageType = "streaming" | "completed";
type FinishedCallbackFn = (message: Message, currentModel: string) => Promise<void>;


export function useAssistantStreaming() {
    const { chatDispatch } = useChat();
    const workerPoolRef = React.useRef<Map<ConversationID, Worker>>(new Map());

    const getOrCreateWorker = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker === undefined) {
            console.log(`create a new worker for the conversation ${conversationId}`);
            const newWorker = new Worker({ name: conversationId.toString() });
            workerPoolRef.current.set(conversationId, newWorker);
            return newWorker;
        }
        return worker;
    }, []);

    const abortAssistantMessage = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker !== undefined) worker.postMessage({ type: "abort" });
    }, []);

    const streamAssistantMessage = (
        conversationId: ConversationID,
        messages: Message[],
        currentModel: string,
        finishedCallback: FinishedCallbackFn,
    ) => {
        const worker = getOrCreateWorker(conversationId);
        console.log(`get the worker for the conversation "${conversationId}"`);
        if (worker.onmessage === null) {
            worker.onmessage = async function (event: MessageEvent<{ type: StreamMessageType, payload: Message }>) {
                chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: event.data.payload });
                if (event.data.type === "completed") {
                    chatDispatch({ type: "SET_ASSISTANT_ANSWER", payload: undefined });
                    await finishedCallback(event.data.payload, currentModel);
                }
            }
        }
        worker.postMessage({ type: "initialValues", payload: { conversationId, messages, currentModel } });
    };

    const terminateWorker = React.useCallback((conversationId: ConversationID) => {
        const worker = workerPoolRef.current.get(conversationId);
        if (worker !== undefined) {
            worker.terminate();
            workerPoolRef.current.delete(conversationId);
        }
    }, []);

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