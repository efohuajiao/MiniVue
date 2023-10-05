import { isReadonly, shallowReadonly } from "./reactive"

describe("shallowReadonly", () => {
    test('should not make non-reactive properties reactive', () => {
        const props = shallowReadonly({ n: { foo: 1 } })
        expect(isReadonly(props.n)).toBe(false)
        expect(isReadonly(props)).toBe(true)
    })
})