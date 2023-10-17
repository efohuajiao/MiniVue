import { effect } from "../reactivity/effect";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { shapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppApi } from "./createApp";
import { Fragment, Text } from "./createVNode";

/**
 * @description: 自定义渲染器，用于可以自定义元素创建方式，可以跨端
 * @param {*} options
 * @return {*}
 */
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProps,
    insert: hostInsert,
  } = options;

  function render(vnode, container) {
    patch(null, vnode, container, null);
    // patch
  }

  /**
   * @description: 给节点打补丁,处理Element或者Component
   * @param {*} n1 旧虚拟节点
   * @param {*} n2 新虚拟节点
   * @param {*} container 容器
   * @param {*} parentComponent 父组件
   * @return {*}
   */
  function patch(n1, n2, container, parentComponent) {
    // 去处理组件

    // 判断是不是element类型,是element就处理element类型
    // processElement();
    const { type, shapeFlag } = n2;
    switch (type) {
      // 使用fragment包裹插槽，直接去挂载children
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        // 通过与运算判断是element类型还是component类型
        if (shapeFlag & shapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }

  function processText(n1: any, n2, container: any) {
    // console.log(vnode); type: Symbol(Text), props: {…}, shapeFlag: 6, children: '你好呀', el: null
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  /**
   * @description: 处理element类型的节点
   * @param {any} vnode
   * @param {any} container
   * @return {*}
   */
  function processElement(n1, n2: any, container: any, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchELement(n1, n2, container);
    }
  }

  /**
   * @description: 挂载element元素
   * @param {any} vnode
   * @param {any} container
   * @return {*}
   */
  function mountElement(vnode: any, container: any, parentComponent) {
    // 创建dom节点
    /*
    vnode: {
      type,
      props,
      children 
    }
  */
    const el = (vnode.el = hostCreateElement(vnode.type));

    // children有两种类型，一种是string，一种是array，包含了子元素
    const { children, shapeFlag } = vnode;
    // 通过与运算判断children是string类型还是array类型
    if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }
    const { props } = vnode; // props是dom元素的属性，比如id、class这些
    for (const key in props) {
      //遍历这些属性，将其添加到创建的元素上
      const val = props[key];

      hostPatchProps(el, key, null, val);
    }
    hostInsert(el, container);
  }

  /**
   * @description: 更新元素
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {*} container 容器
   * @return {*}
   */
  function patchELement(n1, n2, container) {
    // console.log("n1", n1);
    // console.log("n2", n2);
    const newProps = n2.props || EMPTY_OBJ;
    const oldProps = n1.props || EMPTY_OBJ;

    // 将n2的el赋值为n1的el，这样下次再次更新n2的el就是最近一次的el
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);
  }

  function patchProps(el, oldProps, newProps) {
    // 遍历新节点
    // console.log(newProps);

    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp !== nextProp) {
          hostPatchProps(el, key, prevProp, nextProp);
        }
      }

      // 当旧节点不为空猜进行判断
      if (oldProps !== EMPTY_OBJ) {
        // 如果新的props里不存在key，则直接删除
        for (let key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProps(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  /**
   * @description: 用于处理element元素类型的数组children
   * @param {any} vnode
   * @param {any} container
   * @return {*}
   */
  function mountChildren(vnode: any, container: any, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent);
  }

  function mountComponent(initialVNode: any, container: any, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);

    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance: any, initialVNode: any, container: any) {
    // 将渲染函数存入effect副作用函数中，当render里调用响应式数据时就会触发依赖收集，当更新数据时就会重新调用effect函数
    effect(() => {
      // 第一次渲染
      if (!instance.isMounted) {
        const { proxy } = instance;
        // subTree就是虚拟节点树

        // 修改render的this指向，当在render中调用this时，会引用创建的proxy，获取setup返回的数据
        // 存储当前的subTree，便于在更新时进行比较
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance);

        // 此时，当前组件的所有element元素都已经创建并且挂载好了，将el绑定给instance的vnode,用于获取this.$el时传递
        initialVNode.el = subTree.el;
        instance.isMounted = true; // 表示挂载完成
      } else {
        // else里表示
        const { proxy } = instance;
        // subTree就是虚拟节点树

        const subTree = instance.render.call(proxy);
        const preSubTree = instance.subTree; // 获取之前的subTree
        instance.subTree = subTree; // 更新组件instance的subTree，便于下次比较时也是新的
        patch(preSubTree, subTree, container, instance);

        // console.log("subTree", subTree);
        // console.log("preSubTree", preSubTree);
      }
    });
  }
  return {
    createApp: createAppApi(render),
  };
}
