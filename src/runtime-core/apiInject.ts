import { getCurrentInstance } from "./component";

export function provide(key: any, value: any) {
  // 存
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    let { provides } = currentInstance;

    // 将provides的原型赋值为父组件实例的parent的provides，可以根据原型链去寻找
    const parentProvides = currentInstance.parent.provides;
    if (provides === parentProvides) {
      // init,只重写一次
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  // 取
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    // 当父组件没有provide这个key时，可以设置默认值
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
