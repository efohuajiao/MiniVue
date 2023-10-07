import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";
window.self = null;
export const App = {
  name: "App",
  render() {
    window.self = this;

    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
      },
      [
        h("p", { class: "red" }, "red"),
        h(Foo, {
          // on+Event
          onAdd(a, b) {
            console.log("onAdd", a, b);
          },
          onAddFoo(a, b) {
            console.log("onAddFoo", a, b);
          },
        }),
      ]
    );
  },

  setup() {
    return {
      msg: "min-vue",
    };
  },
};
