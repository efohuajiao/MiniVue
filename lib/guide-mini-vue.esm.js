const extend = Object.assign;
const isObject = (obj) => {
    return obj !== null && typeof obj === "object";
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key); // 判断是不是自己对象上有的属性
/**
 * @description: 将add-foo类型变成addFoo
 * @param {*} str
 * @return {*}
 */
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
/**
 * @description: 将字符串首字母大写
 * @param {string} str
 * @return {*}
 */
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
/**
 * @description: 将字符串首字母大写并在前面加上on
 * @param {string} str
 * @return {*}
 */
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

// 收集依赖
const targetMap = new Map();
// 触发依赖
function trigger(target, key) {
    const depMaps = targetMap.get(target);
    const dep = depMaps.get(key);
    triggerEffects(dep);
}
/**
 * @description: 将触发依赖单独提取出来，因为ref是基本数据类型，不需要map去记录属性的依赖
 *              只需要set去收集依赖就行
 * @param {*} dep
 * @return {*}
 */
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

// 只触发一次get
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
/**
 * @description: 创建getter
 * @param {*} isReadonly 是否是由readonly创建
 * @return {*}
 */
function createGetter(isReadonly = false, isShallowReadonly = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) { // 如果key等于枚举中的IS_REACTIVE,则说明调用了isReactive，返回!isReadonly
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) { // 如果key等于枚举中的IS_READONLY,则说明调用了isReadonly，返回isReadonly
            return isReadonly;
        }
        const value = Reflect.get(target, key);
        if (isReadonly && isShallowReadonly) { // shallowReadonly的get
            return value;
        }
        if (isObject(value)) { // 如果reactive的值是对象的话，将其也用proxy进行代理
            return isReadonly ? readonly(value) : reactive(value);
        }
        return value;
    };
}
/**
 * @description: 创建setter
 * @return {*}
 */
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
}
/**
 * @description: reactive的proxy配置项
 * @return {*}
 */
const mutableHanlders = {
    get,
    set,
};
/**
 * @description: readonly的proxy配置项
 * @return {*}
 */
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key${key}不可以被修改，因为它是readonly`);
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet //shallowReadonly与readonly除了get有区别，其他没有区别
});

function createReactiveObject(raw, baseHandlers) {
    if (!raw) {
        console.warn(`raw ${raw} 必须是一个对象`);
        return raw;
    }
    return new Proxy(raw, baseHandlers);
}
function reactive(raw) {
    return createReactiveObject(raw, mutableHanlders);
}
/**
 * @description: readonly生成的数只有getter，没有setter
 * @param {*} raw
 * @return {*}
 */
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
/**
 * @description: 将传入的对象的浅层作为响应式，如果内部也有对象的话，不予处理
 * @param {*} value
 * @return {*}
 */
function shallowReadonly(value) {
    return createReactiveObject(value, shallowReadonlyHandlers);
}

function emit(instance, event, ...args) {
    //   console.log("emit1111", instance, event);
    const { props } = instance;
    // 获取实例的props属性，判断父组件有没有传入对应的事件
    // TPP
    // 先去写特定的行为 -> 重构成通用的行为
    //   const capitalize = "onAdd";
    //   const handler = props[capitalize];
    // add -> Add
    // add-foo -> addFoo
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

/**
 * @description: 初始化组件的props,将虚拟节点的props赋值给创建的组件实例
 * @param {*} instance
 * @param {*} rawProps
 * @return {*}
 */
function initProps(instance, rawProps) {
    instance.props = rawProps;
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    // 获取组件的this时proxy的配置项，可能是setup的返回值，也可能是组件的额外配置项，比如$el、$data等
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

/**
 * @description: 初始化组件的slots
 * @param {*} instance
 * @param {*} children
 * @return {*}
 */
function initSlots(instance, children) {
    const { vnode } = instance;
    // 如果是slots类型的话，则再进行slots初始化
    if (vnode.shapeFlag & 16 /* shapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    // 传入的children可能是数组也可能是虚拟节点，如果是虚拟节点用[]包裹
    //   instance.slots = Array.isArray(children) ? children : [children];
    // children是对象，具名插槽的情况遍历对象，将每一个插槽的名称填充到slots对象中，将其赋给instance.slots
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotsValue(value(props));
    }
}
function normalizeSlotsValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
    };
    // emit需要获取component这个实例参数，所以需要使用bind重新生成一个含有component参数的函数
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // 初始化组件的props
    initProps(instance, instance.vnode.props);
    // 初始化组件的slots
    initSlots(instance, instance.vnode.children);
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
        // 调用setup时将此时的instance实例赋值给currentInstance，用于外部获取
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
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
let currentInstance = null;
/**
 * @description: 获取当前组件实例
 * @return {*}
 */
function getCurrentInstance() {
    return currentInstance;
}
/**
 * @description: 设置当前组件实例
 * @param {*} instance
 * @return {*}
 */
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
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
    // 如果虚拟节点是 组件+children object
    if (vnode.shapeFlag & 2 /* shapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* shapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
/**
 * @description: 直接创建文本节点
 * @param {any} text
 * @return {*}
 */
function createTextNode(text) {
    return createVNode(Text, {}, text);
}
// 在创建虚拟节点的时候，判断虚拟节点的类型，给它的shapeFlag赋值，将其变成0001(ELement类型)或0010(Component类型)
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* shapeFlags.ELEMENT */
        : 2 /* shapeFlags.STATEFUL_COMPONENT */;
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
    const { type, shapeFlag } = vnode;
    switch (type) {
        // 使用fragment包裹插槽，直接去挂载children
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            // 通过与运算判断是element类型还是component类型
            if (shapeFlag & 1 /* shapeFlags.ELEMENT */) {
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* shapeFlags.STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
            break;
    }
}
function processFragment(vnode, container) {
    mountChildren(vnode, container);
}
function processText(vnode, container) {
    // console.log(vnode); type: Symbol(Text), props: {…}, shapeFlag: 6, children: '你好呀', el: null
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
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

/**
 * @description: 用于将传入的slots数组转换成虚拟节点
 * @param {*} slots
 * @return {*}
 */
function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // 作用域插槽，此时它是一个函数
        if (typeof slot === "function") {
            // 因为children不允许为对象，作用域插槽是多个对象包裹的函数
            // 使用Fragment标志是一个插槽，直接去挂载children
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

export { createApp, createTextNode, getCurrentInstance, h, renderSlots };
