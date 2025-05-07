import { UUID } from 'crypto';
import { Dexie, EntityTable } from 'dexie';


export type ConversationID = UUID;
type UserMessageID = UUID;
type AssistantMessageID = UUID;
type MessageID = UserMessageID | AssistantMessageID;
type Role = 'user' | 'assistant';

export interface Conversation {
    id: ConversationID;
    title: string;
    startDate: Date;
    userMessageIds: UserMessageID[];
    lastMessageId: MessageID | undefined;
}

interface UserMessage {
    id: UserMessageID;
    role: Role & "user";
    content: string;
    date: Date;
    conversationId: ConversationID;
    parentId: AssistantMessageID | undefined;
    isActive: boolean;
    answerMessageId: AssistantMessageID | undefined;
}

interface AssistantMessage {
    id: AssistantMessageID;
    role: Role & "assistant";
    content: string;
    date: Date;
    conversationId: ConversationID;
    parentId: UserMessageID;
    nextMessageIds: UserMessageID[];
}

export interface Message {
    id: MessageID;
    role: Role;
    content: string;
    date: Date;
    conversationId: ConversationID;
}


const db = new Dexie("LocalRAG") as Dexie & {
    conversations: EntityTable<Conversation, 'id'>;
    userMessages: EntityTable<UserMessage, 'id'>;
    assistantMessages: EntityTable<AssistantMessage, 'id'>;
};

db.version(1).stores({
    conversations: "id, startDate, *userMessageIds",
    userMessages: "id, date, conversationId, isActive, answerMessageId",
    assistantMessages: "id, date, conversationId, *nextMessageIds",
});

function isUserMessage(message: Message): message is UserMessage {
    return message.role === "user";
}

function isAssistantMessage(message: Message): message is AssistantMessage {
    return message.role === "assistant";
}

export async function getConversation(conversationId: ConversationID): Promise<Conversation | undefined> {
    return await db.conversations.get(conversationId);
}

async function getConversationWithError(conversationId: ConversationID): Promise<Conversation> {
    const conversation = await db.conversations.get(conversationId);
    if (conversation === undefined) throw new Error(`Can't find a conversation with id=${conversationId}`);
    return conversation;
}

export async function getConversations(): Promise<Conversation[]> {
    return await db.conversations.toCollection().sortBy("startDate");
}

export async function newConversation(): Promise<ConversationID> {
    const id = crypto.randomUUID();
    const userMessageIds: UserMessageID[] = [];
    const title = "New Conversation";
    const startDate = new Date();
    const lastMessageId = undefined;
    const conversation = { id, title, startDate, userMessageIds, lastMessageId };
    await db.conversations.add(conversation);
    return conversation.id;
}

export async function updateConversationTitle(conversationId: ConversationID, title: string) {
    try {
        await db.transaction("rw", db.conversations, async () => {
            await db.conversations.update(conversationId, { title: title });
        });
    } catch (error) {
        console.error("Failed to update the title of the conversation:", error);
    }
}

export async function getConversationTitle(conversationId: ConversationID): Promise<string> {
    return (await getConversationWithError(conversationId)).title;
}


export async function deleteConversation(conversationId: ConversationID) {
    await db.transaction("rw", db.conversations, db.userMessages, db.assistantMessages, async () => {
        await db.userMessages.where("conversationId").equals(conversationId).delete();
        await db.assistantMessages.where("conversationId").equals(conversationId).delete();
        await db.conversations.delete(conversationId);
    });
}


async function findActiveUserMessage(userMessageIds: UserMessageID[]): Promise<UserMessage | undefined> {
    for (const userMessageId of userMessageIds) {
        const userMessage = await db.userMessages.get(userMessageId);
        if (userMessage !== undefined && userMessage.isActive) return userMessage;
    }
}

export async function isUserMessageActive(userMessageId: UserMessageID): Promise<boolean> {
    const userMessage = await db.userMessages.get(userMessageId)
    if (userMessage === undefined) return false;
    return userMessage.isActive;
}

export async function setUserMessageStatus(userMessageId: UserMessageID, isActive: boolean) {
    await db.transaction("rw", db.userMessages, async () => {
        await db.userMessages.update(userMessageId, { isActive });
    });
}

export async function getSiblingIds(conversationId: ConversationID, userMessageId: UserMessageID): Promise<UserMessageID[]> {
    const userMessage = await db.userMessages.get(userMessageId);
    if (userMessage !== undefined) {
        let siblings: UserMessageID[] | undefined;
        if (userMessage.parentId !== undefined) {
            const answerMessage = await db.assistantMessages.get(userMessage.parentId);
            if (answerMessage !== undefined) siblings = answerMessage.nextMessageIds;
        } else {
            const conversation = await db.conversations.get(conversationId);
            if (conversation !== undefined && conversation.userMessageIds.includes(userMessageId)) siblings = conversation.userMessageIds;
        }
        if (siblings !== undefined) {
            return siblings;
        }
    }
    return [];
}

export async function getMessages(conversationId: ConversationID): Promise<Message[]> {
    const conversation = await getConversationWithError(conversationId);
    const messages: Message[] = [];
    let currentUserMessage = await findActiveUserMessage(conversation.userMessageIds);
    while (currentUserMessage !== undefined) {
        messages.push(currentUserMessage);
        const currentAnswerMessage = (
            (currentUserMessage.answerMessageId !== undefined) ?
                await db.assistantMessages.get(currentUserMessage.answerMessageId)
                : undefined
        );
        if (currentAnswerMessage !== undefined) {
            messages.push(currentAnswerMessage);
            currentUserMessage = await findActiveUserMessage(currentAnswerMessage.nextMessageIds);
        } else {
            currentUserMessage = undefined;
        }
    }
    return messages;
}


async function insertUserMessage(conversation: Conversation, lastMessageId: AssistantMessageID | undefined, message: Message): Promise<UserMessage | undefined> {
    let userMessage: UserMessage | undefined;
    await db.transaction("rw", db.conversations, db.userMessages, db.assistantMessages, async () => {
        let activeMessage: UserMessage | undefined;
        if (lastMessageId === undefined) {
            activeMessage = await findActiveUserMessage(conversation.userMessageIds);
            conversation.userMessageIds.push(message.id);
            await db.conversations.update(
                conversation.id,
                {
                    userMessageIds: conversation.userMessageIds,
                    lastMessageId: message.id
                }
            );
        } else {
            const lastAssistantMessage = await db.assistantMessages.get(lastMessageId);
            if (lastAssistantMessage !== undefined) {
                activeMessage = await findActiveUserMessage(lastAssistantMessage.nextMessageIds);
                lastAssistantMessage.nextMessageIds.push(message.id);
                await db.assistantMessages.update(lastMessageId, { nextMessageIds: lastAssistantMessage.nextMessageIds });
                await db.conversations.update(conversation.id, { lastMessageId: message.id });
            }
            else {
                throw new Error(`Can't find the last message "${lastMessageId}" in the assistant messages`);
            }
        }
        if (activeMessage !== undefined) {
            db.userMessages.update(activeMessage.id, { isActive: false });
        }
        userMessage = createUserMessage(message.conversationId, message.content, lastMessageId, true, message.id, message.date);
        await db.userMessages.add(userMessage);
    });
    return userMessage;
}

export async function addUserMessage(conversationId: ConversationID, message: Message) {
    const conversation = await getConversationWithError(conversationId);
    await insertUserMessage(conversation, conversation.lastMessageId, message);
}


async function insertAssistantMessage(conversation: Conversation, lastMessageId: UserMessageID, message: Message) {
    const lastUserMessage = await db.userMessages.get(lastMessageId);
    if (lastUserMessage !== undefined) {
        await db.transaction("rw", db.conversations, db.userMessages, db.assistantMessages, async () => {
            await db.userMessages.update(lastMessageId, { answerMessageId: message.id });
            await db.conversations.update(conversation.id, { lastMessageId: message.id });
            const assistantMessage = createAssistantMessage(message.conversationId, message.content, lastMessageId, message.id, message.date);
            await db.assistantMessages.add(assistantMessage);
        });
    } else {
        throw new Error(`Can't find the last message "${lastMessageId}" in the user messages`);
    }
}

export async function addAssistantMessage(conversationId: ConversationID, message: Message) {
    const conversation = await getConversationWithError(conversationId);
    if (conversation.lastMessageId === undefined) throw new Error(`Can't start a conversation with a "${message.role}" message`);
    await insertAssistantMessage(conversation, conversation.lastMessageId, message);
}



export async function editMessage(conversationId: ConversationID, editedMessageId: UserMessageID, content: string): Promise<UserMessage | undefined> {
    let userMessage: UserMessage | undefined;
    await db.transaction("rw", db.conversations, db.userMessages, db.assistantMessages, async () => {
        const conversation = await getConversationWithError(conversationId);
        const editedMessage = await db.userMessages.get(editedMessageId);
        if (editedMessage !== undefined) {
            const parentId = editedMessage.parentId;
            userMessage = await insertUserMessage(conversation, parentId, createMessage(conversationId, "user", content));
            // const userMessage = createUserMessage(conversationId, content, parentId, false);
            // // Set the editedMessage to inactive
            // await db.userMessages.update(editedMessageId, { isActive: false });
            // // Update the next messages of the parent answer
            // if (parentId !== undefined) {
            //     const lastAssistantMessage = await db.assistantMessages.get(parentId);
            //     if (lastAssistantMessage !== undefined) {
            //         lastAssistantMessage.nextMessageIds.push(userMessage.id);
            //         await db.assistantMessages.update(parentId, { nextMessageIds: lastAssistantMessage.nextMessageIds });
            //     } else {
            //         throw new Error(`Can't find the parent message with the id "${parentId}"`);
            //     }
            // }
            // // Update last message of the conversation
            // await db.conversations.update(conversationId, { lastMessageId: userMessage.id })
        } else {
            throw new Error(`Can't edit the message because the id "${editedMessageId}" is not available`);
        }
    });
    return userMessage;
}

export function createMessage(
    conversationId: ConversationID,
    role: Role,
    content: string,
    id: MessageID | undefined = undefined,
    date: Date | undefined = undefined,
): Message {
    let messageId: MessageID;
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


function createUserMessage(
    conversationId: ConversationID,
    content: string,
    parentId: AssistantMessageID | undefined = undefined,
    isActive: boolean = false,
    id: UserMessageID | undefined = undefined,
    date: Date | undefined = undefined,
    answerMessageId: AssistantMessageID | undefined = undefined,
): UserMessage {
    return {
        ...createMessage(conversationId, "user", content, id, date),
        role: "user",
        parentId: parentId,
        isActive: isActive,
        answerMessageId: answerMessageId,
    };
}

function createAssistantMessage(
    conversationId: ConversationID,
    content: string,
    parentId: UserMessageID,
    id: AssistantMessageID | undefined = undefined,
    date: Date | undefined = undefined,
): AssistantMessage {
    return {
        ...createMessage(conversationId, "assistant", content, id, date),
        role: "assistant",
        parentId,
        nextMessageIds: []
    };
}
