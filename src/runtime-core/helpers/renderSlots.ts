import { createVNode } from "../createVNode";

/**
 * @description: 用于将传入的slots数组转换成虚拟节点
 * @param {*} slots
 * @return {*}
 */
export function renderSlots(slots, name, props) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {
      return createVNode("div", {}, slot(props));
    }
  }
}
