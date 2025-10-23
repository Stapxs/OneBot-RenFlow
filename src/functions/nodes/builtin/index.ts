import { ConsoleNode } from './ConsoleNode'
import { NoteNode } from './NoteNode'
import { SendTextNode } from './SendTextNode'
import { CustomJSNode } from './CustomJSNode'
import { IfElseNode } from './IfElseNode'

/**
 * 导出所有内置节点
 */
export const builtinNodes = [
    new ConsoleNode(),
    new NoteNode(),
    new SendTextNode(),
    new CustomJSNode(),
    new IfElseNode(),
    // 未来添加更多内置节点...
]

export {
    ConsoleNode,
    NoteNode,
    SendTextNode,
    CustomJSNode,
    IfElseNode
}
