import { effect, stop } from "../effect";
import { reactive } from "../reactive";

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age:11
        })
        let nextAge;
        effect(()=>{
            nextAge = user.age;
        })
        expect(nextAge).toBe(11);

        // 更新数据
        user.age++;
        expect(nextAge).toBe(12)
    })

    it("happy path", () => {
        let foo = 10;
        const runner = effect(()=>{
            foo++;
            return 'foo'
        })
        expect(foo).toBe(11);
        const str = runner();
        expect(foo).toBe(12);
        expect(str).toBe('foo');

    })

    it('stop', () => {
        let dummy;
        const obj = reactive({prop:1})
        const runner = effect(()=>{
            dummy = obj.prop
        })
        obj.prop = 2;
        expect(dummy).toBe(2);
        stop(runner); // stop让runner函数无法执行
        obj.prop++;
        expect(dummy).toBe(2);
        runner();
        expect(dummy).toBe(3);
    })

    it('onStop', () => {
        const obj = reactive({
            foo:1
        })
        const onStop = jest.fn()
        let dummy;
        const runner = effect(
            () => {
                dummy = obj.foo;
            },{
                onStop
            }
        );
        stop(runner);
        expect(onStop).toBeCalledTimes(1);
    })
})