import { isObject } from "../shared/index";
import { shapeFlags } from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");
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
    shapeFlag: getShapeFlag(type),
    children,
    el: null,
  };
  // 在创建虚拟节点的时候，判断虚拟节点children的类型，通过或运算给它的shapeFlag赋值，将其变成1001或1010或0101或0110
  if (typeof children === "string") {
    vnode.shapeFlag = vnode.shapeFlag | shapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag = vnode.shapeFlag | shapeFlags.ARRAY_CHILDREN;
  }

  // 如果虚拟节点是 组件+children object
  if (vnode.shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= shapeFlags.SLOT_CHILDREN;
    }
  }
  return vnode;
}

/**
 * @description: 直接创建文本节点
 * @param {any} text
 * @return {*}
 */
export function createTextNode(text: any) {
  return createVNode(Text, {}, text);
}

// 在创建虚拟节点的时候，判断虚拟节点的类型，给它的shapeFlag赋值，将其变成0001(ELement类型)或0010(Component类型)
function getShapeFlag(type) {
  return typeof type === "string"
    ? shapeFlags.ELEMENT
    : shapeFlags.STATEFUL_COMPONENT;
}
