import { isObject } from "../shared/index";
import { shapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./createVNode";

export function render(vnode, container) {
  patch(vnode, container);
  // patch
}

/**
 * @description: 给节点打补丁,处理Element或者Component
 * @param {*} vnode 虚拟节点
 * @param {*} container 容器
 * @return {*}
 */
function patch(vnode, container) {
  // 去处理组件

  // 判断是不是element类型,是element就处理element类型
  // processElement();
  const { type, shapeFlag } = vnode;
  switch (type) {
    // 使用fragment包裹插槽，直接去挂载children
    case Fragment:
      processFragment(vnode, container);
      break;
    case Text:
      processText(vnode, container);
      break;
    default:
      // 通过与运算判断是element类型还是component类型
      if (shapeFlag & shapeFlags.ELEMENT) {
        processElement(vnode, container);
      } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container);
      }
      break;
  }
}

function processFragment(vnode: any, container: any) {
  mountChildren(vnode, container);
}

function processText(vnode: any, container: any) {
  // console.log(vnode); type: Symbol(Text), props: {…}, shapeFlag: 6, children: '你好呀', el: null
  const { children } = vnode;
  const textNode = (vnode.el = document.createTextNode(children));
  container.append(textNode);
}

/**
 * @description: 处理element类型的节点
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

/**
 * @description: 挂载element元素
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function mountElement(vnode: any, container: any) {
  // 创建dom节点
  /*
    vnode: {
      type,
      props,
      children 
    }
  */
  const el = (vnode.el = document.createElement(vnode.type));

  // children有两种类型，一种是string，一种是array，包含了子元素
  const { children, shapeFlag } = vnode;
  // 通过与运算判断children是string类型还是array类型
  if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }
  const { props } = vnode; // props是dom元素的属性，比如id、class这些
  for (const key in props) {
    //遍历这些属性，将其添加到创建的元素上
    const val = props[key];
    const isOn = /^on[A-Z]/.test(key); // 判断属性是不是事件，是事件的话要额外处理
    if (isOn) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val);
    }
  }
  container.append(el);
}

/**
 * @description: 用于处理element元素类型的数组children
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode, container) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container: any) {
  const instance = createComponentInstance(initialVNode);
  setupComponent(instance);

  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode: any, container: any) {
  const { proxy } = instance;
  // subTree就是虚拟节点树

  // 修改render的this指向，当在render中调用this时，会引用创建的proxy，获取setup返回的数据
  const subTree = instance.render.call(proxy);

  patch(subTree, container);

  // 此时，当前组件的所有element元素都已经创建并且挂载好了，将el绑定给instance的vnode,用于获取this.$el时传递
  initialVNode.el = subTree.el;
}
