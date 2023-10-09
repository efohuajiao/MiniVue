import { createVNode, Fragment } from "../createVNode";

/**
 * @description: 用于将传入的slots数组转换成虚拟节点
 * @param {*} slots
 * @return {*}
 */
export function renderSlots(slots, name, props) {
  const slot = slots[name];

  if (slot) {
    // 作用域插槽，此时它是一个函数

    if (typeof slot === "function") {
      // 因为children不允许为对象，作用域插槽是多个对象包裹的函数
      // 使用Fragment标志是一个插槽，直接去挂载children
      return createVNode(Fragment, {}, slot(props));
    }
  }
}
