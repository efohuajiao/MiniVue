import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
    setup(props){
        // props.count
        console.log(props.count);
        props.count ++;
        console.log(props.count);
    },
    render(){
        return h("div",{},"Foo:"+this.count)
    }
}