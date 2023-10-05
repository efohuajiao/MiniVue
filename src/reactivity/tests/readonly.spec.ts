import { isReadonly, readonly, isProxy } from "../reactive";

describe('readonly',() => {
    it('happy path', () => {
        // 无法被修改，即不会触发依赖收集
         const original = {foo: 1, bar: {bar:2}};
         const wrapped = readonly(original);
         expect(isReadonly(wrapped)).toBe(true);
         expect(isProxy(wrapped)).toBe(true);
         expect(wrapped).not.toBe(original);
         expect(wrapped.foo).toBe(1);
    })

    it('warn then call set', () => {
        // redonly无法修改，修改了会报警告
        console.warn = jest.fn();

        const user = readonly({
            age:10
        })
        user.age = 11;
        expect(console.warn).toBeCalled();
    })
})