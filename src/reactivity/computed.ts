import { ReactiveEffect } from "./effect";

class computedRefImpl {
    private _effect: any;
    private _value: any;
    private _dirty:Boolean = true;

    constructor(getter) {
        /*computed用到了effect副作用函数，当依赖的响应式发生改变时，会触发trigger，
          将dirty修改为true，当再次获取.value时，会获取重新执行getter
        */
        this._effect = new ReactiveEffect(getter, () => {
            if(!this._dirty) {
                this._dirty = true;
            }
        })
    }

    get value() {
        // dirty值用于控制缓存，当依赖的响应式的值发生改变时dirty变为true
        if(this._dirty){
            this._dirty = false;
            // 在run中获取依赖响应式的值，所以会触发它的get，进而将computed的getter函数存入map中
            this._value = this._effect.run();
        }
        return this._value;
    }
}

export function computed(getter) {
    return new computedRefImpl(getter);
}