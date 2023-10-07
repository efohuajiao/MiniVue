// 提高性能，通过&和|运算判断类型，但可读性会变差
/*
    0000
  | 0001
  ————————
    0001

    0000
  & 0001
  ————————
    0000
*/
export const enum shapeFlags {
  ELEMENT = 1, // 0001
  STATEFUL_COMPONENT = 1 << 1, // 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4, // 1 0000
}
