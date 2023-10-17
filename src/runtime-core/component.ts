import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlot";

export function createComponentInstance(vnode: any, parent: any) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    emit: () => {},
  };
  // emit需要获取component这个实例参数，所以需要使用bind重新生成一个含有component参数的函数
  component.emit = emit.bind(null, component) as any;

  return component;
}

export function setupComponent(instance) {
  // 初始化组件的props
  initProps(instance, instance.vnode.props);
  // 初始化组件的slots
  initSlots(instance, instance.vnode.children);

  setupStatefulComponent(instance);
}

/**
 * @description: 创建有状态的组件
 * @param {any} instance
 * @return {*}
 */
function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  const { setup } = Component;
  // 代理模板中如果引用了setup返回的数据，使用proxy代理获取setup返回的数据并配置get，如果在render中调用this,则会触发get，在setupState中找
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  // setup可能返回函数也可能返回对象
  if (setup) {
    // 调用setup时将此时的instance实例赋值给currentInstance，用于外部获取
    setCurrentInstance(instance);
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;

  instance.render = Component.render;
}

let currentInstance = null;
/**
 * @description: 获取当前组件实例
 * @return {*}
 */
export function getCurrentInstance() {
  return currentInstance;
}
/**
 * @description: 设置当前组件实例
 * @param {*} instance
 * @return {*}
 */
function setCurrentInstance(instance) {
  currentInstance = instance;
}
