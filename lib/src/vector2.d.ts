export declare class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    equals(v: Vector2): boolean;
    static compare(v1?: Vector2, v2?: Vector2): boolean;
    copyFrom(original: Vector2): void;
    clone(): Vector2;
    get length(): number;
    get lengthSquared(): number;
    static clone(original: Vector2 | undefined): Vector2 | null;
    static cloneNullToZero(original: Vector2 | undefined): Vector2;
    static zero(): Vector2;
    static one(): Vector2;
    static Zero: Vector2;
    static One: Vector2;
    static Left: Vector2;
    static Right: Vector2;
    static Up: Vector2;
    static Down: Vector2;
}
//# sourceMappingURL=vector2.d.ts.map