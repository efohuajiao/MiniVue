
/**
 * @description: 用于创建一个虚拟节点
 * @param {*} type
 * @param {*} props
 * @param {*} children
 * @return {*}
 */
export function createVNode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children
    }
    return vnode;
} 

