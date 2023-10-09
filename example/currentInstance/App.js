// 可以在 setup 中使用 getCurrentInstance 获取组件实例对象
import { h, getCurrentInstance } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js';
export const App = {
  name: "App",
  setup() {
    const instance = getCurrentInstance();
    console.log("App:",instance);
  },
  render(){
    return  h("div", {}, [h("p", {}, "getCurrentInstance"), h(Foo)])
  }
};
