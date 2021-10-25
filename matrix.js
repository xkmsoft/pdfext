
export class Matrix3x3 {
    constructor(values) {
        this.v = new Array(3).fill(0).map(() => new Array(3).fill(0))
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const index = (i === 0) ? j : (i * 3) + j
                this.v[i][j] = values[index]
            }
        }
    }
    static Identity () {
        return new Matrix3x3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ])
    }

    static Zero() {
        return new Matrix3x3(new Array(9).fill(0))
    }

    Mul (matrix) {
        const result = Matrix3x3.Zero()
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result.v[i][j] += this.v[i][k] * matrix.v[k][j]
                }
            }
        }
        return result
    }
}
