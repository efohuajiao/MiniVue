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
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    patch(null, vnode, container, null, null);
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
  function patch(n1, n2, container, parentComponent, anchor) {
    // 去处理组件

    // 判断是不是element类型,是element就处理element类型
    // processElement();
    const { type, shapeFlag } = n2;
    switch (type) {
      // 使用fragment包裹插槽，直接去挂载children
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        // 通过与运算判断是element类型还是component类型
        if (shapeFlag & shapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function processFragment(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    mountChildren(n2.children, container, parentComponent, anchor);
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
  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchELement(n1, n2, container, parentComponent, anchor);
    }
  }

  /**
   * @description: 挂载element元素
   * @param {any} vnode
   * @param {any} container
   * @return {*}
   */
  function mountElement(vnode: any, container: any, parentComponent, anchor) {
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
      mountChildren(vnode.children, el, parentComponent, anchor);
    }
    const { props } = vnode; // props是dom元素的属性，比如id、class这些
    for (const key in props) {
      //遍历这些属性，将其添加到创建的元素上
      const val = props[key];

      hostPatchProps(el, key, null, val);
    }
    hostInsert(el, container, anchor);
  }

  /**
   * @description: 更新元素
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {*} container 容器
   * @return {*}
   */
  function patchELement(n1, n2, container, parentComponent, anchor) {
    // console.log("n1", n1);
    // console.log("n2", n2);
    const newProps = n2.props || EMPTY_OBJ;
    const oldProps = n1.props || EMPTY_OBJ;

    // 将n2的el赋值为n1的el，这样下次再次更新n2的el就是最近一次的el
    const el = (n2.el = n1.el);
    patchChildren(n1, n2, el, parentComponent, anchor);
    patchProps(el, oldProps, newProps);
  }

  /**
   * @description: 更新节点的children
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {*} container 父容器

   * @return {*}
   */
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const { shapeFlag } = n2;
    const prevShapeFlag = n1.shapeFlag;
    const c1 = n1.children;
    const c2 = n2.children;
    // 新节点是字符串的情况
    if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
      // 旧children是数组，新children是字符串
      // 如果旧节点是数组，新节点是字符串,则将旧节点删除
      if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
        // 删除旧children数组
        unmountChildren(n1.children);
      }

      // 旧children是字符串，新children是字符串
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      // 新节点是数组的情况
      if (prevShapeFlag & shapeFlags.TEXT_CHILDREN) {
        // 将原本的文件设置为空
        hostSetElementText(container, "");
        // 去挂载children
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // children都为数组,则进行双端diff比较
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  /**
   * @description: 比较数组children
   * @param {*} c1 旧的children数组
   * @param {*} c2 新的children数组
   * @param {*} container 容器
   * @param {*} parentComponent 父组件
   * @return {*}
   */
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // 比较是否是相同的vnode节点
    function isSameVNodeType(c1, c2) {
      return c1.type === c2.type && c1.key === c2.key;
    }

    // 1、数组长度一样，比较数组左侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }

    // 2、数组长度一样，比较数组右侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // 3、数组长度不一样，新的数组比老的数组长
    if (i > e1) {
      if (i <= e2) {
        // 此时i大于e1，说明新children在与旧children的长度是相等的
        // A B
        // A B C   此时A和B是相等的,而i<=e2,说明新的children是有新的值的
        const nextPos = e2 + 1;
        const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        // console.log(anchor);
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 4、数组长度不一样，新的数组长度比老的数组短，要删除节点
      if (i <= e1) {
        hostRemove(c1[i].el);
      }
    } else {
      // 5、比较中间节点
      // A B C D
      // A C B D

      const s1 = i;
      const s2 = i;
      let patched = 0; // 新节点patch的数量
      const toBePatched = e2 - s2 + 1;
      const newIndexMap = new Map(); // 建立新children中节点的映射表，key：节点的key， value：出现的索引

      let moved = false; // 是否要移动
      let maxNewIndexSoFar = 0;

      // 建立一个定长的数组，长度为新children中间需要对比的长度，赋初值为0,表示还未建立映射关系
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

      for (let i = s2; i <= e2; i++) {
        // 遍历新节点，将每个新节点存入映射表中
        const newChild = c2[i];
        newIndexMap.set(newChild.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        // 遍历旧children
        const prevChild = c1[i];

        if (patched >= toBePatched) {
          // 如果新节点patch的数量大于等于toBePatched，旧children后面的节点都是新children中没有的，直接去除
          hostRemove(prevChild.el);
          continue;
        }

        let newIndex; // 表示新children中对应相同老节点的位置

        if (prevChild.key != null) {
          // 如果老节点有key值且在映射表中找到，说明该节点未删除
          newIndex = newIndexMap.get(prevChild.key); // 获取映射表中的key
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        // 并未在新children中找到对应的节点，直接删除
        if (!newIndex) {
          hostRemove(prevChild.el);
        } else {
          // 如果新索引大于最大索引，说明是递增的，不需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            // 如果不大于，说明要移动
            moved = true;
          }
          newIndexToOldIndexMap[newIndex - s2] = i + 1; // 索引表示新children中节点减去与老节点相同元素长度后的索引，value表示其在新children中的的索引值
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      // console.log(newIndexToOldIndexMap);
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []; // 生成的子序列是值对应的索引

      let j = increasingNewIndexSequence.length - 1; // j指针指向最长递增子序列
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor =
          nextIndex + 1 < c2.length - 1 ? c2[nextIndex + 1].el : null;
        if (newIndexToOldIndexMap[i] === 0) {
          // 如果索引为0表示是新节点，需要创建
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 如果不相等，则进行移动
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }

  /**
   * @description: 卸载children数组节点
   * @param {*} children 数组
   * @return {*}
   */
  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      // 获取节点的每一个el，将其挨个移除
      let el = children[i].el;
      hostRemove(el);
    }
  }

  /**
   * @description: 更新节点的props属性
   * @param {*} el
   * @param {*} oldProps
   * @param {*} newProps
   * @return {*}
   */
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
  function mountChildren(
    children: any,
    container: any,
    parentComponent,
    anchor
  ) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountComponent(
    initialVNode: any,
    container: any,
    parentComponent,
    anchor
  ) {
    const instance = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);

    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVNode: any,
    container: any,
    anchor
  ) {
    // 将渲染函数存入effect副作用函数中，当render里调用响应式数据时就会触发依赖收集，当更新数据时就会重新调用effect函数
    effect(() => {
      // 第一次渲染
      if (!instance.isMounted) {
        const { proxy } = instance;
        // subTree就是虚拟节点树

        // 修改render的this指向，当在render中调用this时，会引用创建的proxy，获取setup返回的数据
        // 存储当前的subTree，便于在更新时进行比较
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance, anchor);

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
        patch(preSubTree, subTree, container, instance, anchor);

        // console.log("subTree", subTree);
        // console.log("preSubTree", preSubTree);
      }
    });
  }
  return {
    createApp: createAppApi(render),
  };
}

// 求最长递增子序列
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
