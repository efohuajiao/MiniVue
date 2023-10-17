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

/**
 * @description: 用于创建一个根组件app
 * @param {*} rootComponent app的组件
 * @return {*}
 */
function createAppApi(render) {
    return function createApp(rootComponent) {
        // 返回值是一个对象，包含了很多方法
        return {
            // mount用于将当前组件挂载到指定的dom节点上
            mount(rootContainer) {
                // 将组件转换成虚拟节点
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
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

const extend = Object.assign;
const isObject = (obj) => {
    return obj !== null && typeof obj === "object";
};
const EMPTY_OBJ = {};
function hasChanged(newVal, oldVal) {
    return !Object.is(newVal, oldVal);
}
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

let activeEffect;
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true; // 用来记录stop是否被调用
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        activeEffect = this;
        if (!this.active) {
            // 调用了stop
            return this._fn();
        }
        shouldTrack = true;
        const res = this._fn();
        shouldTrack = false;
        return res;
    }
    stop() {
        // 只需要删除掉dep记录的effect副作用函数即可实现stop
        if (this.active) {
            // 让stop多次调用也只执行一次
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
/**
 * @description: 删除依赖
 * @param {*} effect
 * @return {*}
 */
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
// 收集依赖
const targetMap = new Map();
/**
 * @description: 判断是否需要跟踪依赖
 * @return {*}
 */
function isTracking() {
    // 没有调用effect，只创建reactive响应式数据时，没有activeEffect
    return shouldTrack && activeEffect !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    // target(map) -> key(map) -> dep(set)
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}
/**
 * @description: 将跟踪依赖单独提取出来，因为ref只能支持基本数据类型，所以不需要map记录单独属性的值
 * @param {*} dep
 * @return {*}
 */
function trackEffect(dep) {
    // 如果dep之前添加过，则不需要添加
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
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
/**
 * @description: 副作用函数：会触发传入的回调，随后在回调中数据调用或者修改时都会重新执行
 * @param {*} fn 传入要执行的函数
 * @return {*} 返回也是fn
 */
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options === null || options === void 0 ? void 0 : options.scheduler);
    extend(_effect, options);
    _effect.run();
    // effect返回runner函数，这个runner函数救赎传入的fn，runner函数返回值为fn的返回值
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect; // 将effect实例绑定在runner上，用于调用stop
    return runner;
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
        if (!isReadonly) { // 说明是reactive创建的数据
            track(target, key);
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

// ref是一个refImpl对象，value属性为传入的属性
class refImpl {
    constructor(value) {
        this.__V_isRef = true; // 用于判断是否通过ref创建，用于isRef和unRef
        this._rawValue = value;
        // 判断传入的是对象还是基本数据类型，对象的话需要用reacive进行包裹
        this._value = convert(value);
        this.dep = new Set();
    }
    // 声明value的get方法，在获取value的时候返回私有属性_value
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newVal) {
        // 如果新修改的值和之前的值相等，则不需要触发依赖
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = convert(newVal);
            triggerEffects(this.dep);
        }
    }
}
/**
 * @description: 判断是否是对象，是的话用reactive定义
 * @param {*} value
 * @return {*}
 */
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    // 当需要跟踪时，才触发依赖收集
    if (isTracking()) {
        trackEffect(ref.dep);
    }
}
/**
 * @description: 用ref定义响应式数据
 * @param {*} value
 * @return {*}
 */
function ref(value) {
    return new refImpl(value);
}
/**
 * @description: 判断一个数据是否是ref定义的数据
 * @param {*} ref
 * @return {*}
 */
function isRef(ref) {
    // 用!!是因为如果传入没有响应式的数据，那么ref是没有__V_isRef属性的
    return !!ref.__V_isRef;
}
/**
 * @description: 提取ref.value的值，如果本身不是一个ref，则返回值本身
 * @param {*} ref
 * @return {*}
 */
function unRef(ref) {
    return ref.__V_isRef ? ref.value : ref;
}
/**
 * @description: 常用在template中，如果获取用ref定义的值，直接返回ref.value
 *               修改的话，如果修改的原值是ref且新值不是ref，那么将原值ref.value替换成心智
 *               原值不是ref直接修改
 * @param {*} objectWithRefs
 * @return {*}
 */
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 如果修改的原值是ref且新值不是ref，那么将原值ref.value替换成新值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                // 如果不是，那么直接修改
                return Reflect.set(target, key, value);
            }
        },
    });
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

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
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
        // 当页面用到ref定义的数据时，用proxyRefs直接返回.value
        instance.setupState = proxyRefs(setupResult);
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

function provide(key, value) {
    // 存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        // 将provides的原型赋值为父组件实例的parent的provides，可以根据原型链去寻找
        const parentProvides = currentInstance.parent.provides;
        if (provides === parentProvides) {
            // init,只重写一次
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        // 当父组件没有provide这个key时，可以设置默认值
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

/**
 * @description: 自定义渲染器，用于可以自定义元素创建方式，可以跨端
 * @param {*} options
 * @return {*}
 */
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProps, insert: hostInsert, } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
        // patch
    }
    /**
     * @description: 给节点打补丁,处理Element或者Component
     * @param {*} n1 旧虚拟节点
     * @param {*} n2 新虚拟节点
     * @param {*} container 容器
     * @param {*} parentComponent 父组件
     * @return {*}
     */
    function patch(n1, n2, container, parentComponent) {
        // 去处理组件
        // 判断是不是element类型,是element就处理element类型
        // processElement();
        const { type, shapeFlag } = n2;
        switch (type) {
            // 使用fragment包裹插槽，直接去挂载children
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 通过与运算判断是element类型还是component类型
                if (shapeFlag & 1 /* shapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* shapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processText(n1, n2, container) {
        // console.log(vnode); type: Symbol(Text), props: {…}, shapeFlag: 6, children: '你好呀', el: null
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    /**
     * @description: 处理element类型的节点
     * @param {any} vnode
     * @param {any} container
     * @return {*}
     */
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchELement(n1, n2);
        }
    }
    /**
     * @description: 挂载element元素
     * @param {any} vnode
     * @param {any} container
     * @return {*}
     */
    function mountElement(vnode, container, parentComponent) {
        // 创建dom节点
        /*
        vnode: {
          type,
          props,
          children
        }
      */
        const el = (vnode.el = hostCreateElement(vnode.type));
        // children有两种类型，一种是string，一种是array，包含了子元素
        const { children, shapeFlag } = vnode;
        // 通过与运算判断children是string类型还是array类型
        if (shapeFlag & 4 /* shapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* shapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        const { props } = vnode; // props是dom元素的属性，比如id、class这些
        for (const key in props) {
            //遍历这些属性，将其添加到创建的元素上
            const val = props[key];
            hostPatchProps(el, key, null, val);
        }
        hostInsert(el, container);
    }
    /**
     * @description: 更新元素
     * @param {*} n1 旧节点
     * @param {*} n2 新节点
     * @param {*} container 容器
     * @return {*}
     */
    function patchELement(n1, n2, container) {
        // console.log("n1", n1);
        // console.log("n2", n2);
        const newProps = n2.props || EMPTY_OBJ;
        const oldProps = n1.props || EMPTY_OBJ;
        // 将n2的el赋值为n1的el，这样下次再次更新n2的el就是最近一次的el
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
    }
    function patchProps(el, oldProps, newProps) {
        // 遍历新节点
        // console.log(newProps);
        if (oldProps !== newProps) {
            for (let key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProps(el, key, prevProp, nextProp);
                }
            }
            // 当旧节点不为空猜进行判断
            if (oldProps !== EMPTY_OBJ) {
                // 如果新的props里不存在key，则直接删除
                for (let key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProps(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    /**
     * @description: 用于处理element元素类型的数组children
     * @param {any} vnode
     * @param {any} container
     * @return {*}
     */
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountComponent(initialVNode, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        // 将渲染函数存入effect副作用函数中，当render里调用响应式数据时就会触发依赖收集，当更新数据时就会重新调用effect函数
        effect(() => {
            // 第一次渲染
            if (!instance.isMounted) {
                const { proxy } = instance;
                // subTree就是虚拟节点树
                // 修改render的this指向，当在render中调用this时，会引用创建的proxy，获取setup返回的数据
                // 存储当前的subTree，便于在更新时进行比较
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance);
                // 此时，当前组件的所有element元素都已经创建并且挂载好了，将el绑定给instance的vnode,用于获取this.$el时传递
                initialVNode.el = subTree.el;
                instance.isMounted = true; // 表示挂载完成
            }
            else {
                // else里表示
                const { proxy } = instance;
                // subTree就是虚拟节点树
                const subTree = instance.render.call(proxy);
                const preSubTree = instance.subTree; // 获取之前的subTree
                instance.subTree = subTree; // 更新组件instance的subTree，便于下次比较时也是新的
                patch(preSubTree, subTree, container, instance);
                // console.log("subTree", subTree);
                // console.log("preSubTree", preSubTree);
            }
        });
    }
    return {
        createApp: createAppApi(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = /^on[A-Z]/.test(key); // 判断属性是不是事件，是事件的话要额外处理
    if (isOn) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 如果新的props的val值为undefined或者null的话直接去除这个props
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({ createElement, patchProp, insert });
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createAppApi, createRenderer, createTextNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };
