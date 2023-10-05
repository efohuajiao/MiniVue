import { h } from '../../lib/guide-mini-vue.esm.js';
window.self = null;
export const App = {
    render(){
        window.self = this;

        return h("div",{
            id:"root",
            class:['red','hard'],
            onClick:function(){
                console.log("click");
            }
        },[h("p",{class:"red"},'red'), h("span",{class:"blue"}, 'hello world,hello'+this.msg)]);
    },

    setup(){
        return {
            msg:"min-vue"
        }
    }
}