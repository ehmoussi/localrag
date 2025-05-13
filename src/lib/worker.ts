import { addAssistantMessage, ConversationID, createMessage, extractThinking, Message, updateConversationTitle } from "./db";
import ollama from "ollama";

const BUFFER_STREAMING_SIZE: number = 30;

type WorkerAssistantStreamingMessage =
    { type: "initialValues", payload: { conversationId: ConversationID, messages: Message[], currentModel: string } }
    | { type: "abort" }



self.onmessage = async function (event: MessageEvent<WorkerAssistantStreamingMessage>) {
    switch (event.data.type) {
        case "initialValues": {
            const { conversationId, messages, currentModel } = event.data.payload;
            await streamOllamaAnswer(conversationId, messages, currentModel);
            break;
        }
        case "abort":
            ollama.abort();
            break;
        default: break;
    }
}


async function streamOllamaAnswer(currentConversationId: ConversationID, messages: Message[], currentModel: string) {
    const assistantId = crypto.randomUUID();
    let accumulateContent = "";
    const newMessage = createMessage(currentConversationId, "assistant", "", assistantId);
    try {
        self.postMessage({ type: "streaming", conversationId: currentConversationId, payload: createMessage(currentConversationId, "assistant", "", assistantId) });
        // Send the user message
        const response = await ollama.chat({
            model: currentModel,
            messages: messages,
            stream: true,
        });
        let buffer = "";
        for await (const chunk of response) {
            buffer += chunk.message.content;
            // Dispaly the assistant message currently streaming
            if (buffer.length > BUFFER_STREAMING_SIZE) {
                accumulateContent += buffer;
                const { thinking, answer } = extractThinking(accumulateContent);
                self.postMessage({ type: "streaming", conversationId: currentConversationId, payload: createMessage(currentConversationId, "assistant", answer, assistantId, thinking) });
                buffer = "";
            }
        }
        if (buffer.length > 0) {
            accumulateContent += buffer;
            const { thinking, answer } = extractThinking(accumulateContent);
            // Dispaly the assistant message currently streaming
            self.postMessage({ type: "streaming", conversationId: currentConversationId, payload: createMessage(currentConversationId, "assistant", answer, assistantId, thinking) });
        }
    } catch (error) {
        console.error("Failed to fetch assistant answer:", error);
    } finally {
        // Remove the streaming message
        const { thinking, answer } = extractThinking(accumulateContent);
        newMessage.thinking = thinking;
        newMessage.content = answer;
    }
    await addAssistantMessage(currentConversationId, newMessage);
    // Generate a title if there is no answer yet
    if (messages.length === 1) {
        const title = await generateConversationTitle(currentModel, [...messages, newMessage]);
        await updateConversationTitle(currentConversationId, title);
        self.postMessage({ type: "title", conversationId: currentConversationId, payload: title });
    }
    self.postMessage({ type: "completed", conversationId: currentConversationId, payload: newMessage });
}

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
        const response = await ollama.generate({
            model: currentModel,
            prompt: prompt,
            stream: false, // TODO: replace by true
            options: {
                temperature: 0.3 // Lower for more consistent titles
            }
        });
        const { answer } = extractThinking(response.response.trim());
        return answer;
    } catch {
        return "New Conversation";
    }
}
