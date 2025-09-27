/**
 * 2D Vector class for handling positions, velocities, and directions
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Vector operations
    add(vector) {
        return new Vector2(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector) {
        return new Vector2(this.x - vector.x, this.y - vector.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        if (scalar === 0) return new Vector2(0, 0);
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    // Vector properties
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }

    // Distance between vectors
    distanceTo(vector) {
        return this.subtract(vector).magnitude();
    }

    // Dot product
    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    // Angle in radians
    angle() {
        return Math.atan2(this.y, this.x);
    }

    // Rotate vector by angle (radians)
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    // Convert to cartesian to isometric coordinates
    toIsometric() {
        return new Vector2(
            (this.x - this.y) * 0.5,
            (this.x + this.y) * 0.25
        );
    }

    // Convert from isometric to cartesian coordinates
    fromIsometric() {
        return new Vector2(
            this.x + this.y * 2,
            this.y * 2 - this.x
        );
    }

    // Utility methods
    clone() {
        return new Vector2(this.x, this.y);
    }

    toString() {
        return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    // Static utility methods
    static zero() {
        return new Vector2(0, 0);
    }

    static one() {
        return new Vector2(1, 1);
    }

    static up() {
        return new Vector2(0, -1);
    }

    static down() {
        return new Vector2(0, 1);
    }

    static left() {
        return new Vector2(-1, 0);
    }

    static right() {
        return new Vector2(1, 0);
    }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }
}
