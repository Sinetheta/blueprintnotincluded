"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    equals(v) {
        if (v == null)
            return false;
        return this.x == v.x && this.y == v.y;
    }
    static compare(v1, v2) {
        if (v1 == null && v2 == null)
            return true;
        else if (v1 == null || v2 == null)
            return false;
        else {
            return v1.x == v2.x && v1.y == v2.y;
        }
    }
    copyFrom(original) {
        if (original != null && original.x != null)
            this.x = original.x;
        if (original != null && original.y != null)
            this.y = original.y;
    }
    clone() {
        let returnValue = new Vector2();
        returnValue.copyFrom(this);
        return returnValue;
    }
    get length() {
        return Math.sqrt(this.lengthSquared);
    }
    get lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }
    static clone(original) {
        if (original == null)
            return null;
        let returnValue = new Vector2();
        returnValue.copyFrom(original);
        return returnValue;
    }
    static cloneNullToZero(original) {
        if (original == null || original == undefined)
            return Vector2.zero();
        let returnValue = new Vector2();
        returnValue.copyFrom(original);
        return returnValue;
    }
    static zero() { return new Vector2(0, 0); }
    static one() { return new Vector2(1, 1); }
}
Vector2.Zero = new Vector2();
Vector2.One = new Vector2(1, 1);
Vector2.Left = new Vector2(-1, 0);
Vector2.Right = new Vector2(1, 0);
Vector2.Up = new Vector2(0, 1);
Vector2.Down = new Vector2(0, -1);
exports.Vector2 = Vector2;
