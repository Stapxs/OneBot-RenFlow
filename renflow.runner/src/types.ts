import { Expose, Type, Transform, plainToInstance, instanceToPlain } from 'class-transformer'

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

export class RenMsgText {
  @Expose()
  type!: RenMessageDataType.text

  @Expose()
  text!: string
}

export class RenMessageImage {
  @Expose()
  type!: RenMessageDataType.image

  @Expose()
  url!: string

  @Expose()
  summary?: string

  @Expose()
  subType?: string

  @Expose()
  emojiId?: string

  @Expose()
  packageId?: string
}

export class RenMessageReply {
  @Expose()
  type!: RenMessageDataType.reply

  @Expose()
  id!: string
}

export class SenderDTO {
  @Expose({ name: 'user_id' })
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  userId!: number

  @Expose({ name: 'nickname' })
  nickName!: string

  @Expose({ name: 'card' })
  cardName?: string

  @Expose({ name: 'role' })
  role?: string
}

export class RenMessage {
  @Expose({ name: 'message_id' })
  messageId: string // 消息唯一 ID

  @Expose({ name: 'real_seq' })
  @Transform(({ value }) => value == null ? undefined : Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  messageSeqId?: number // 消息序列 ID

  @Expose({ name: 'message_type' })
  messageType: 'group' | 'private' // 消息类型

  @Expose({ name: 'self_id' })
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  selfId: number // 机器人 ID（收到消息的机器人）

  @Expose({ name: 'target_id' })
  @Transform(({ value }) => value == null ? undefined : Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  targetId?: number // 目标 ID（群消息时为群号，私聊消息时为用户 ID）

  @Expose({ name: 'group_id' })
  @Transform(({ value }) => value == null ? undefined : Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  groupId?: number // 群号（群消息时存在）

  @Expose({ name: 'group_name' })
  groupName?: string // 群名称（群消息时存在）

  @Expose({ name: 'user_id' })
  @Transform(({ value }) => value == null ? undefined : Number(value), { toClassOnly: true })
  @Transform(({ value }) => value == null ? value : String(value), { toPlainOnly: true })
  userId?: number // 发送者用户 ID（私聊消息时存在）

  @Expose({ name: 'sender' })
  @Type(() => SenderDTO)
  sender: SenderDTO

  @Expose({ name: 'raw_message' })
  rawMessage: string // 原始消息内容

  @Expose({ name: 'message' })
  @Transform(({ value }) => {
    // toClassOnly: convert raw {type,data} array to specific class instances
    if (!Array.isArray(value)) return value
    const final: any[] = []
    for (const item of value) {
      switch (item.type) {
        case RenMessageDataType.text:
          final.push(plainToInstance(RenMsgText as any, { type: item.type, text: item.data?.text }, { excludeExtraneousValues: true }))
          break
        case RenMessageDataType.image:
          final.push(plainToInstance(RenMessageImage as any, { type: item.type, url: item.data?.url, summary: item.data?.summary, subType: item.data?.sub_type, emojiId: item.data?.emoji_id, packageId: item.data?.package_id }, { excludeExtraneousValues: true }))
          break
        case RenMessageDataType.reply:
          final.push(plainToInstance(RenMessageReply as any, { type: item.type, id: item.data?.id }, { excludeExtraneousValues: true }))
          break
        default:
          break
      }
    }
    return final
  }, { toClassOnly: true })
  @Transform(({ value }) => {
    // toPlainOnly: convert class instances back to {type,data} objects
    if (!Array.isArray(value)) return value
    const final: any[] = []
    for (const item of value) {
      try {
        const plain = instanceToPlain(item)
        const type = (plain as any).type
        const { type: _, ...rest } = plain as any
        final.push({ type, data: rest })
      } catch (e) {
        // fallback: skip
      }
    }
    return final
  }, { toPlainOnly: true })
  message: RenMessageBodyData[] | string // 消息内容数组

  @Expose({ name: 'time' })
  @Transform(({ value }) => new Date(value * 1000), { toClassOnly: true })
  @Transform(({ value }) => Math.floor((value as Date).getTime() / 1000), { toPlainOnly: true })
  time: Date // 消息发送时间

  // 非映射字段（不会被 classToPlain 处理）
  isMine: boolean // 是否为自己发送的消息

  constructor(init?: Partial<RenMessage>) {
    this.messageId = init?.messageId || ''
    this.messageSeqId = init?.messageSeqId
    this.messageType = init?.messageType || 'private'
    this.selfId = init?.selfId || 0
    this.targetId = init?.targetId
    this.groupId = init?.groupId
    this.userId = init?.userId
    this.sender = init?.sender as any || { userId: 0, nickName: '', role: 'member' }
    this.rawMessage = init?.rawMessage || ''
    this.message = init?.message || ''
    this.time = init?.time ? new Date(init.time as any) : new Date()
    this.isMine = init?.isMine || false
  }

  /** 获取文本内容 */
  static getTextContent(message: RenMessageBodyData[] | string): string {
    if (typeof message === 'string') {
      return message
    } else {
      return message
        .filter(item => (item as any).type === RenMessageDataType.text)
        .map(item => (item as any).text)
        .join('')
    }
  }
}
