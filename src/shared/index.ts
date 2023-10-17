export const extend = Object.assign;

export const isObject = (obj) => {
  return obj !== null && typeof obj === "object";
};

export const EMPTY_OBJ = {};
export function hasChanged(newVal, oldVal) {
  return !Object.is(newVal, oldVal);
}

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key); // 判断是不是自己对象上有的属性

/**
 * @description: 将add-foo类型变成addFoo
 * @param {*} str
 * @return {*}
 */
export const camelize = (str) => {
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};

/**
 * @description: 将字符串首字母大写
 * @param {string} str
 * @return {*}
 */
const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * @description: 将字符串首字母大写并在前面加上on
 * @param {string} str
 * @return {*}
 */
export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalize(str) : "";
};
