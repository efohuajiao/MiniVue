import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffect, triggerEffects } from "./effect";
import { reactive } from "./reactive";

// ref是一个refImpl对象，value属性为传入的属性
class refImpl {
  private _value: any; // ref.value的值
  public dep: any; // ref对应的依赖
  private _rawValue: any; // 用于存储ref原本的值，而不是被reactive包裹的值
  __V_isRef = true; // 用于判断是否通过ref创建，用于isRef和unRef
  constructor(value) {
    this._rawValue = value;
    // 判断传入的是对象还是基本数据类型，对象的话需要用reacive进行包裹
    this._value = convert(value);
    this.dep = new Set();
  }

  // 声明value的get方法，在获取value的时候返回私有属性_value
  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal) {
    // 如果新修改的值和之前的值相等，则不需要触发依赖
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = convert(newVal);
      triggerEffects(this.dep);
    }
  }
}

/**
 * @description: 判断是否是对象，是的话用reactive定义
 * @param {*} value
 * @return {*}
 */
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref) {
  // 当需要跟踪时，才触发依赖收集
  if (isTracking()) {
    trackEffect(ref.dep);
  }
}

/**
 * @description: 用ref定义响应式数据
 * @param {*} value
 * @return {*}
 */
export function ref(value) {
  return new refImpl(value);
}

/**
 * @description: 判断一个数据是否是ref定义的数据
 * @param {*} ref
 * @return {*}
 */
export function isRef(ref) {
  // 用!!是因为如果传入没有响应式的数据，那么ref是没有__V_isRef属性的
  return !!ref.__V_isRef;
}

/**
 * @description: 提取ref.value的值，如果本身不是一个ref，则返回值本身
 * @param {*} ref
 * @return {*}
 */
export function unRef(ref) {
  return ref.__V_isRef ? ref.value : ref;
}

/**
 * @description: 常用在template中，如果获取用ref定义的值，直接返回ref.value
 *               修改的话，如果修改的原值是ref且新值不是ref，那么将原值ref.value替换成心智
 *               原值不是ref直接修改
 * @param {*} objectWithRefs
 * @return {*}
 */
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },

    set(target, key, value) {
        // 如果修改的原值是ref且新值不是ref，那么将原值ref.value替换成新值
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        // 如果不是，那么直接修改
        return Reflect.set(target, key, value);
      }
    },
  });
}
