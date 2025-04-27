import { Dexie, EntityTable } from 'dexie';

export interface Message {
    id: number;
    role: string;
    content: string;
}


export const db = new Dexie("LocalRAG") as Dexie & {
    messages: EntityTable<Message, 'id'>;
};

db.version(1).stores({
    messages: "++id, role, content"
});


export async function addMessage(message: Message) {
    try {
        await db.messages.add(message);
    } catch (error) {
        console.error("Failed to save into the db:", error);
    }
} 
