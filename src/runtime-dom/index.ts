import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

/**
 * @description: 设置元素的props
 * @param {*} el 元素
 * @param {*} key props的key
 * @param {*} prevVal 旧props的值
 * @param {*} nextVal 新props的值
 * @return {*}
 */
function patchProp(el, key, prevVal, nextVal) {
  const isOn = /^on[A-Z]/.test(key); // 判断属性是不是事件，是事件的话要额外处理
  if (isOn) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    // 如果新的props的val值为undefined或者null的话直接去除这个props
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

/**
 * @description: 添加元素
 * @param {*} el 子元素
 * @param {*} parent 父元素
 * @return {*}
 */
function insert(child, parent, anchor) {
  // parent.append(el);
  // insertBefore:在执行anchor前插入子节点，如果不存在则默认在末尾插入
  parent.insertBefore(child, anchor || null);
}

/**
 * @description: 移除元素
 * @param {*} el 被移除的元素
 * @return {*}
 */
function remove(el) {
  // 获取el的父元素，调用removeChildren将其删除
  let parent = el.parentNode;
  // console.log(parent);
  if (parent) {
    parent.removeChild(el);
  }
}

/**
 * @description: 设置元素的text
 * @param {*} text
 * @param {*} container
 * @return {*}
 */
function setElementText(container, text) {
  container.textContent = text;
}
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
});

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
