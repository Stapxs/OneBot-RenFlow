export interface RenMessage {
    messageId: string,                      // 消息唯一 ID
    messageSeqId?: number,                  // 消息序列 ID
    messageType: 'group' | 'private',       // 消息类型
    selfId: number,                         // 机器人 ID（收到消息的机器人）
    targetId?: number,                       // 目标 ID（群消息时为群号，私聊消息时为用户 ID）
    groupId?: number,                        // 群号（群消息时存在）
    userId?: number,                         // 发送者用户 ID（私聊消息时存在）
    sender: {
        userId: number,                     // 发送者用户 ID
        nickName: string,                   // 发送者昵称
        cardName?: string,                  // 发送者群名片（群消息时存在）
        role: 'owner' | 'admin' | 'member'  // 发送者角色（群消息时存在）
    },
    rawMessage: string,                     // 原始消息内容
    message: RenMessageBodyData[] | string, // 消息内容数组
    time: Date,                             // 消息发送时间
    raw: { [key: string]: any }             // 原始消息对象
}

export enum RenMessageDataType {
    text = 'text',
    image = 'image',
    music = 'music',
    video = 'video',
    voice = 'record',
    file = 'file',
    reply = 'reply',
    json = 'json',
    face = 'face',
    mface = 'mface', // 商城表情
    markdown = 'markdown',
    node = 'node',  // 合并转发消息节点
    forward = 'forward',  // 合并转发消息，用于上报
    xml = 'xml',
    poke = 'poke'
}

export type RenMessageBodyData = RenMsgText | RenMessageImage | RenMessageReply

export interface RenMsgText {
    type: RenMessageDataType.text
    text: string
}

export interface RenMessageImage {
    type: RenMessageDataType.image;
    url: string;
    summary?: string;
    subType?: number;
    emojiId?: string;
    packageId?: string;
}

export interface RenMessageReply {
    type: RenMessageDataType.reply;
    id: number;
}
