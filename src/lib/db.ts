import { UUID } from 'crypto';
import { Dexie, EntityTable } from 'dexie';
import { C } from 'ollama/dist/shared/ollama.f6b57f53.mjs';



export interface Message {
    id: UUID;
    role: string;
    content: string;
}

export interface Conversation {
    id: UUID;
    title: string;
    startDate: Date;
    messages: Message[];
}

export const db = new Dexie("LocalRAG") as Dexie & {
    conversations: EntityTable<Conversation, 'id'>;
};

db.version(1).stores({
    conversations: "id, *messages"
});


export async function getConversations(): Promise<Conversation[]> {
    return await db.conversations.toCollection().sortBy("startDate");
}

export async function newConversation(): Promise<UUID> {
    const id = crypto.randomUUID();
    const messages: Message[] = [];
    const title = "New Conversation";
    const startDate = new Date();
    const conversation = { id, title, startDate, messages };
    await db.conversations.add(conversation);
    return conversation.id;
}

export async function getMessages(conversationId: UUID): Promise<Message[]> {
    const conversation = await db.conversations.get(conversationId);
    if (conversation === undefined) throw new Error(`Can't find a conversation with id=${conversationId}`);
    return conversation.messages.filter((m): m is Message => m !== undefined);
}


export async function addMessage(conversationId: UUID, message: Message) {
    try {
        await db.transaction("rw", db.conversations, async () => {
            const oldMessages = await getMessages(conversationId);
            await db.conversations.update(conversationId, { messages: [...oldMessages, message] });
        });
    } catch (error) {
        console.error("Failed to save into the db:", error);
    }
}

function createMessage(role: string, content: string, id: UUID | undefined = undefined): Message {
    let messageId: UUID;
    if (id == undefined)
        messageId = crypto.randomUUID();
    else
        messageId = id;
    return { id: messageId, role, content };
}


export function createUserMessage(content: string, id: UUID | undefined = undefined): Message {
    return createMessage("user", content, id);
}

export function createAssistantMessage(content: string, id: UUID | undefined = undefined): Message {
    return createMessage("assistant", content, id);
}
