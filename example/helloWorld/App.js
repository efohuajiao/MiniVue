import { h } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';
window.self = null;
export const App = {
    name:"App",
    render(){
        window.self = this;

        return h("div",{
            id:"root",
            class:['red','hard'],
            onClick:function(){
                console.log("click");
            }
        },[h("p",{class:"red"},'red'), h(Foo,{count:1})]);
    },

    setup(){
        return {
            msg:"min-vue"
        }
    }
}