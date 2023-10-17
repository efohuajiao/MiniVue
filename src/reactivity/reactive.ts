import {
  mutableHanlders as mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

function createReactiveObject(raw, baseHandlers) {
  if (!raw) {
    console.warn(`raw ${raw} 必须是一个对象`);
    return raw;
  }
  return new Proxy(raw, baseHandlers);
}

export function reactive(raw) {
  return createReactiveObject(raw, mutableHandlers);
}

/**
 * @description: readonly生成的数只有getter，没有setter
 * @param {*} raw
 * @return {*}
 */
export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers);
}

/**
 * @description: 判断传入的数据是否是reactive的响应式数据
 * @param {*} value 对象
 * @return {*}
 */
export function isReactive(value) {
  // 如果是响应式，获取对象的值会触发get操作，在get中进行判断
  // 如果不是，那么不会触发get操作，获取到的是undefined，用!!给它转换成false
  return !!value[ReactiveFlags.IS_REACTIVE];
}

/**
 * @description: 判断传入的数据是否是readonly的数据
 * @param {*} value
 * @return {*}
 */
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

/**
 * @description: 判断传入的数据是否是proxy代理的响应式数据
 * @param {*} value
 * @return {*}
 */
export function isProxy(value) {
  // 只需判断是不是reactive或者readonly的即可
  return isReactive(value) || isReadonly(value);
}

/**
 * @description: 将传入的对象的浅层作为响应式，如果内部也有对象的话，不予处理
 * @param {*} value
 * @return {*}
 */
export function shallowReadonly(value) {
  return createReactiveObject(value, shallowReadonlyHandlers);
}
