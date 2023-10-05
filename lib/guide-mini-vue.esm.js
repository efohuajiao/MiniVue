const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    // 获取组件的this时proxy的配置项，可能是setup的返回值，也可能是组件的额外配置项，比如$el、$data等
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    };
    return component;
}
function setupComponent(instance) {
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
/**
 * @description: 创建有状态的组件
 * @param {any} instance
 * @return {*}
 */
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    // 代理模板中如果引用了setup返回的数据，使用proxy代理获取setup返回的数据并配置get，如果在render中调用this,则会触发get，在setupState中找
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    // setup可能返回函数也可能返回对象
    if (setup) {
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}

function render(vnode, container) {
    patch(vnode, container);
    // patch
}
/**
 * @description: 给节点打补丁,处理Element或者Component
 * @param {*} vnode 虚拟节点
 * @param {*} container 容器
 * @return {*}
 */
function patch(vnode, container) {
    // 去处理组件
    // 判断是不是element类型,是element就处理element类型
    // processElement();
    const { shapeFlag } = vnode;
    // 通过与运算判断是element类型还是component类型
    if (shapeFlag & 1 /* shapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* shapeFlags.STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
/**
 * @description: 处理element类型的节点
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function processElement(vnode, container) {
    mountElement(vnode, container);
}
/**
 * @description: 挂载element元素
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function mountElement(vnode, container) {
    // 创建dom节点
    /*
      vnode: {
        type,
        props,
        children
      }
    */
    const el = (vnode.el = document.createElement(vnode.type));
    // children有两种类型，一种是string，一种是array，包含了子元素
    const { children, shapeFlag } = vnode;
    // 通过与运算判断children是string类型还是array类型
    if (shapeFlag & 4 /* shapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* shapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    const { props } = vnode; // props是dom元素的属性，比如id、class这些
    for (const key in props) {
        //遍历这些属性，将其添加到创建的元素上
        const val = props[key];
        const isOn = /^on[A-Z]/.test(key); // 判断属性是不是事件，是事件的话要额外处理
        if (isOn) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
/**
 * @description: 用于处理element元素类型的数组children
 * @param {any} vnode
 * @param {any} container
 * @return {*}
 */
function mountChildren(vnode, container) {
    vnode.children.forEach((v) => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance;
    // subTree就是虚拟节点树
    // 修改render的this指向，当在render中调用this时，会引用创建的proxy，获取setup返回的数据
    const subTree = instance.render.call(proxy);
    patch(subTree, container);
    // 此时，当前组件的所有element元素都已经创建并且挂载好了，将el绑定给instance的vnode,用于获取this.$el时传递
    initialVNode.el = subTree.el;
}

/**
 * @description: 用于创建一个虚拟节点
 * @param {*} type
 * @param {*} props
 * @param {*} children
 * @return {*}
 */
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        shapeFlag: getShapeFlag(type),
        children,
        el: null,
    };
    // 在创建虚拟节点的时候，判断虚拟节点children的类型，通过或运算给它的shapeFlag赋值，将其变成1001或1010或0101或0110
    if (typeof children === "string") {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* shapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* shapeFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
// 在创建虚拟节点的时候，判断虚拟节点的类型，给它的shapeFlag赋值，将其变成0001或0010
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* shapeFlags.ELEMENT */
        : 2 /* shapeFlags.STATEFUL_COMPONENT */;
}

/**
 * @description: 用于创建一个根组件app
 * @param {*} rootComponent app的组件
 * @return {*}
 */
function createApp(rootComponent) {
    // 返回值是一个对象，包含了很多方法
    return {
        // mount用于将当前组件挂载到指定的dom节点上
        mount(rootContainer) {
            // 将组件转换成虚拟节点
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
