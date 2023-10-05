import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

// 只触发一次get
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
/**
 * @description: 创建getter
 * @param {*} isReadonly 是否是由readonly创建
 * @return {*}
 */
function createGetter(isReadonly = false, isShallowReadonly = false) {
  return function get(target, key) {
    if(key === ReactiveFlags.IS_REACTIVE) { // 如果key等于枚举中的IS_REACTIVE,则说明调用了isReactive，返回!isReadonly
      return !isReadonly;
    }else if(key === ReactiveFlags.IS_READONLY) { // 如果key等于枚举中的IS_READONLY,则说明调用了isReadonly，返回isReadonly
      return isReadonly;
    }
    
    const value = Reflect.get(target, key);
    if(isReadonly && isShallowReadonly) { // shallowReadonly的get
      return value;
    }

    if(isObject(value)) { // 如果reactive的值是对象的话，将其也用proxy进行代理
      return isReadonly ? readonly(value) : reactive(value);
    }
    if (!isReadonly) { // 说明是reactive创建的数据
      track(target, key);
    }
    return value;
  };
}

/**
 * @description: 创建setter
 * @return {*}
 */
function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    // 触发依赖
    trigger(target, key);
    return res;
  };
}

/**
 * @description: reactive的proxy配置项
 * @return {*}
 */
export const mutableHanlders = {
  get,
  set,
};

/**
 * @description: readonly的proxy配置项
 * @return {*}
 */
export const readonlyHandlers = {
    get:readonlyGet,
    set(target, key, value){
        console.warn(`key${key}不可以被修改，因为它是readonly`);
        
        return true;
    }
}

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get:shallowReadonlyGet //shallowReadonly与readonly除了get有区别，其他没有区别
})