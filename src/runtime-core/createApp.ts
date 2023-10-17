import { createVNode } from "./createVNode";

/**
 * @description: 用于创建一个根组件app
 * @param {*} rootComponent app的组件
 * @return {*}
 */
export function createAppApi(render) {
  return function createApp(rootComponent) {
    // 返回值是一个对象，包含了很多方法
    return {
      // mount用于将当前组件挂载到指定的dom节点上
      mount(rootContainer) {
        // 将组件转换成虚拟节点
        const vnode = createVNode(rootComponent);
        render(vnode, rootContainer);
      },
    };
  };
}
