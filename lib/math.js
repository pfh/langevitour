export function randInt(n) {
    return Math.floor(Math.random() * n);
}
export function permutation(n) {
    let array = Array(n).fill(0).map((x, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
export function times(n, func, ...args) {
    let result = Array(n);
    for (let i = 0; i < n; i++)
        result[i] = func(...args);
    return result;
}
export function zeros(n) {
    return Array(n).fill(0);
}
export function vecSub(a, b) {
    let result = Array(a.length);
    for (let i = 0; i < result.length; i++)
        result[i] = a[i] - b[i];
    return result;
}
export function vecAdd(a, b) {
    let result = Array(a.length);
    for (let i = 0; i < result.length; i++)
        result[i] = a[i] + b[i];
    return result;
}
export function vecDot(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i++)
        result += a[i] * b[i];
    return result;
}
export function vecScale(a, b) {
    let result = Array(a.length);
    for (let i = 0; i < result.length; i++)
        result[i] = a[i] * b;
    return result;
}
export function zeroMat(n, m) {
    return times(n, zeros, m);
}
export function matMulInto(result, A, B) {
    let a = A.length, b = A[0].length, c = B[0].length;
    for (let i = 0; i < a; i++)
        for (let k = 0; k < c; k++) {
            let s = 0;
            for (let j = 0; j < b; j++)
                s += A[i][j] * B[j][k];
            result[i][k] = s;
        }
}
export function matMul(A, B) {
    let result = times(A.length, () => Array(B[0].length));
    matMulInto(result, A, B);
    return result;
}
export function matTcrossprodInto(result, A, B) {
    let a = A.length, b = A[0].length, c = B.length;
    for (let i = 0; i < a; i++)
        for (let k = 0; k < c; k++) {
            let s = 0;
            for (let j = 0; j < b; j++)
                s += A[i][j] * B[k][j];
            result[i][k] = s;
        }
}
export function matTcrossprod(A, B) {
    let result = times(A.length, Array, B.length);
    matTcrossprodInto(result, A, B);
    return result;
}
export function matAdd(A, B) {
    let result = times(A.length, Array, A[0].length);
    for (let i = 0; i < A.length; i++)
        for (let j = 0; j < A[0].length; j++)
            result[i][j] = A[i][j] + B[i][j];
    return result;
}
export function matScale(A, b) {
    return A.map(row => row.map(value => value * b));
}
export function matScaleInto(A, b) {
    for (let i = 0; i < A.length; i++)
        for (let j = 0; j < A[0].length; j++)
            A[i][j] *= b;
}
export function matAddInto(A, B) {
    for (let i = 0; i < A.length; i++)
        for (let j = 0; j < A[0].length; j++)
            A[i][j] += B[i][j];
}
export function matTranspose(A) {
    let result = times(A[0].length, Array, A.length);
    for (let i = 0; i < A.length; i++)
        for (let j = 0; j < A[0].length; j++)
            result[j][i] = A[i][j];
    return result;
}
export function removeSpin(motion, proj) {
    /* Ensure each row of motion is in the null space of the rows of proj.
       proj rows are assumed to be orthonormal.
       
       This is used to avoid adding random spin to the projection. */
    let result = [...motion];
    for (let i = 0; i < result.length; i++)
        for (let j = 0; j < proj.length; j++)
            result[i] = vecSub(result[i], vecScale(proj[j], vecDot(motion[i], proj[j])));
    return result;
}
//# sourceMappingURL=math.js.map