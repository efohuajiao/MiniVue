import { shapeFlags } from "../shared/ShapeFlags";

/**
 * @description: 初始化组件的slots
 * @param {*} instance
 * @param {*} children
 * @return {*}
 */
export function initSlots(instance, children) {
  const { vnode } = instance;
  // 如果是slots类型的化，则再进行slots初始化
  if (vnode.shapeFlag & shapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots);
  }
}

function normalizeObjectSlots(children, slots) {
  // 传入的children可能是数组也可能是虚拟节点，如果是虚拟节点用[]包裹
  //   instance.slots = Array.isArray(children) ? children : [children];
  // children是对象，具名插槽的情况遍历对象，将每一个插槽的名称填充到slots对象中，将其赋给instance.slots

  for (const key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotsValue(value(props));
  }
}
function normalizeSlotsValue(value) {
  return Array.isArray(value) ? value : [value];
}
