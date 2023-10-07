import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
  //   console.log("emit1111", instance, event);
  const { props } = instance;
  // 获取实例的props属性，判断父组件有没有传入对应的事件

  // TPP
  // 先去写特定的行为 -> 重构成通用的行为
  //   const capitalize = "onAdd";
  //   const handler = props[capitalize];
  // add -> Add
  // add-foo -> addFoo

  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}
