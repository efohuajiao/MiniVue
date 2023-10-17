import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

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

function insert(el, parent) {
  parent.append(el);
}

const renderer: any = createRenderer({ createElement, patchProp, insert });

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
