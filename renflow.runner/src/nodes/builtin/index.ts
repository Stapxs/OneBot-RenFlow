import { ConsoleNode } from './ConsoleNode.js'
import { NoteNode } from './NoteNode.js'
import { SendTextNode } from './SendTextNode.js'
import { CustomJSNode } from './CustomJSNode.js'
import { IfElseNode } from './IfElseNode.js'
import { HtmlRenderNode } from './HtmlRenderNode.js'
import { SendMessageNode } from './SendMessageNode.js'

/**
 * 导出所有内置节点
 */
export const builtinNodes = [
    new ConsoleNode(),
    new NoteNode(),
    new SendTextNode(),
    new SendMessageNode(),
    new HtmlRenderNode(),
    new CustomJSNode(),
    new IfElseNode(),
]

export {
    ConsoleNode,
    NoteNode,
    SendTextNode,
    SendMessageNode,
    HtmlRenderNode,
    CustomJSNode,
    IfElseNode
}
