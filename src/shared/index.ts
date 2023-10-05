export const extend = Object.assign;

export const isObject = (obj) => {
    return obj !== null && typeof obj === 'object';
}

export function hasChanged(newVal, oldVal) {
    return !Object.is(newVal, oldVal);
}