/**
 * @description: 初始化组件的props,将虚拟节点的props赋值给创建的组件实例
 * @param {*} instance
 * @param {*} rawProps
 * @return {*}
 */
export function initProps(instance, rawProps) {
  instance.props = rawProps;
}
