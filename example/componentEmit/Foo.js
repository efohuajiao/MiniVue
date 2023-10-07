import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  setup(props, { emit }) {
    const emitAdd = () => {
      // console.log("emit add");
      // emit传入事件名就会去触发父组件对应的事件
      // emit("add", 1, 2)
      emit("add-foo", 2, 4);
    };
    return {
      emitAdd,
    };
  },
  render() {
    const btn = h("button", { onClick: this.emitAdd }, "emitAdd");
    const foo = h("p", {}, "foo");
    return h("div", {}, [btn, foo]);
  },
};
