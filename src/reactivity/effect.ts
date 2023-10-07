import { extend } from "../shared";

let activeEffect;
let shouldTrack = false;

export class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true; // 用来记录stop是否被调用
  onStop?: () => void;
  public scheduler: Function | undefined;
  constructor(fn, scheduler?: Function) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    activeEffect = this;
    if (!this.active) {
      // 调用了stop
      return this._fn();
    }
    shouldTrack = true;
    const res = this._fn();
    shouldTrack = false;
    return res;
  }

  stop() {
    // 只需要删除掉dep记录的effect副作用函数即可实现stop
    if (this.active) {
      // 让stop多次调用也只执行一次
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

/**
 * @description: 删除依赖
 * @param {*} effect
 * @return {*}
 */
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

// 收集依赖
const targetMap = new Map();

/**
 * @description: 判断是否需要跟踪依赖
 * @return {*}
 */
export function isTracking() {
  // 没有调用effect，只创建reactive响应式数据时，没有activeEffect
  return shouldTrack && activeEffect !== undefined;
}

export function track(target, key) {
  if (!isTracking()) return;
  // target(map) -> key(map) -> dep(set)
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  trackEffect(dep);
}

/**
 * @description: 将跟踪依赖单独提取出来，因为ref只能支持基本数据类型，所以不需要map记录单独属性的值
 * @param {*} dep
 * @return {*}
 */
export function trackEffect(dep) {
  // 如果dep之前添加过，则不需要添加
  if (dep.has(activeEffect)) return;
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

// 触发依赖
export function trigger(target, key) {
  const depMaps = targetMap.get(target);
  const dep = depMaps.get(key);
  triggerEffects(dep);
}

/**
 * @description: 将触发依赖单独提取出来，因为ref是基本数据类型，不需要map去记录属性的依赖
 *              只需要set去收集依赖就行
 * @param {*} dep
 * @return {*}
 */
export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

/**
 * @description: 副作用函数：会触发传入的回调，随后在回调中数据调用或者修改时都会重新执行
 * @param {*} fn 传入要执行的函数
 * @return {*} 返回也是fn
 */
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options?.scheduler);

  extend(_effect, options);
  _effect.run();
  // effect返回runner函数，这个runner函数救赎传入的fn，runner函数返回值为fn的返回值
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect; // 将effect实例绑定在runner上，用于调用stop
  return runner;
}

/**
 * @description: stop函数调用后，不会触发对应响应式数据的依赖函数调用
 * @param {*} runner  effect副作用函数的返回值
 * @return {*}
 */
export function stop(runner) {
  runner.effect.stop();
}
