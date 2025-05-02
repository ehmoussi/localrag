import { UUID } from 'crypto';
import { Dexie, EntityTable } from 'dexie';


export interface Message {
    id: UUID;
    role: string;
    content: string;
    date: Date;
    conversationId: UUID;
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

export async function updateConversationTitle(conversationId: UUID, title: string) {
    try {
        await db.transaction("rw", db.conversations, async () => {
            await db.conversations.update(conversationId, { title: title });
        });
    } catch (error) {
        console.error("Failed to update the title of the conversation:", error);
    }
}

export async function getConversationTitle(conversationId: UUID): Promise<string> {
    const conversation = await db.conversations.get(conversationId);
    if (conversation === undefined) throw new Error(`Can't find a conversation with id=${conversationId}`);
    return conversation.title;
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

function createMessage(conversationId: UUID, role: string, content: string, id: UUID | undefined = undefined, date: Date | undefined = undefined): Message {
    let messageId: UUID;
    if (id == undefined)
        messageId = crypto.randomUUID();
    else
        messageId = id;
    let messageDate;
    if (date === undefined)
        messageDate = new Date();
    else
        messageDate = date;
    return { id: messageId, role, content, date: messageDate, conversationId };
}


export function createUserMessage(conversationId: UUID, content: string, id: UUID | undefined = undefined, date: Date | undefined = undefined): Message {
    return createMessage(conversationId, "user", content, id, date);
}

export function createAssistantMessage(conversationId: UUID, content: string, id: UUID | undefined = undefined, date: Date | undefined = undefined): Message {
    return createMessage(conversationId, "assistant", content, id, date);
}
