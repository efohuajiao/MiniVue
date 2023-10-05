import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container){
    patch(vnode, container);
    // patch

}

/**
 * @description: 给节点打补丁
 * @param {*} vnode 虚拟节点
 * @param {*} container 容器
 * @return {*}
 */
function patch(vnode, container) {
    // 去处理组件

    // 判断是不是element类型
    // processElement();
    processComponent(vnode, container);

}

function processComponent(vnode, container) {
    mountComponent(vnode, container);
}

function mountComponent(vnode: any, container:any) {
    const instance = createComponentInstance(vnode)
    setupComponent(instance);

    setupRenderEffect(instance, container);
}


function setupRenderEffect(instance: any, container:any) {
    // subTree就是虚拟节点树
    const subTree = instance.render();

    patch(subTree, container);
}

