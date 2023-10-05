import { h } from '../../lib/guide-mini-vue.esm.js';
export const App = {

    render(){
        return h("div","hello world");
    },

    setup(){
        return {
            msg:"world"
        }
    }
}