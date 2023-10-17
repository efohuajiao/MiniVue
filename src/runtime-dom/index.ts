import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProps(el, key, val) {
  const isOn = /^on[A-Z]/.test(key); // 判断属性是不是事件，是事件的话要额外处理
  if (isOn) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}

function insert(el, parent) {
  parent.append(el);
}

const renderer: any = createRenderer({ createElement, patchProps, insert });

export function createApp(...args) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
