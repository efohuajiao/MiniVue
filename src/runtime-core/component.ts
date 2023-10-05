export function createComponentInstance(vnode:any) {
    const component = {
        vnode,
        type: vnode.type
    }

    return component
}

export function setupComponent(instance) {
    // initProps()
    // initSlots()

    setupStatefulComponent(instance)
}

/**
 * @description: 创建有状态的组件
 * @param {any} instance
 * @return {*}
 */
function setupStatefulComponent(instance: any) {
    const Component = instance.type;
    const {setup} = Component;

    // setup可能返回函数也可能返回对象
    if(setup) {
        const setupResult = setup();

        handleSetupResult(instance, setupResult)
    }
}


function handleSetupResult(instance, setupResult: any) {

    if(typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }

    finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
    const Component = instance.type;

    instance.render = Component.render;
}

