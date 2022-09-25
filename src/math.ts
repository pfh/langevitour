
export function randInt(n: number) { 
    return Math.floor(Math.random()*n); 
}

export function permutation(n: number) {
    let array = Array(n).fill(0).map((x,i)=>i);
    for (let i = array.length-1; i>0; i--) {
        const j = randInt(i+1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function times(n: number, func: Function, ...args: any[]) {
    let result = Array(n);
    for(let i=0;i<n;i++) result[i] = func(...args);
    return result;
}

export function zeros(n: number) { 
    return Array(n).fill(0); 
}

export function vecSub(a: number[], b: number[]) {
    let result = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]-b[i];
    return result;
}

export function vecAdd(a: number[], b: number[]) {
    let result: number[] = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]+b[i];
    return result;
}

export function vecDot(a: number[], b: number[]) {
    let result = 0;
    for(let i=0;i<a.length;i++) result += a[i]*b[i];
    return result;
}

export function vecScale(a: number[], b: number) {
    let result: number[] = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]*b;
    return result;
}

export function zeroMat(n: number, m: number) { 
    return times(n,zeros,m) as number[][]; 
}

export function matMulInto(result: number[][], A: number[][], B: number[][]) {
    let a = A.length, b = A[0].length, c = B[0].length;

    for(let i=0;i<a;i++)
    for(let k=0;k<c;k++) {
        let s = 0;
        for(let j=0;j<b;j++)
            s += A[i][j] * B[j][k];
        result[i][k] = s;
    }
}

export function matMul(A: number[][], B: number[][]) {
    let result = times(A.length, ()=>Array(B[0].length)) as number[][];
    matMulInto(result, A, B);
    return result
}

export function matTcrossprodInto(result: number[][], A: number[][], B: number[][]) {
    let a = A.length, b = A[0].length, c = B.length;

    for(let i=0;i<a;i++)
    for(let k=0;k<c;k++) {
        let s = 0;
        for(let j=0;j<b;j++) 
             s += A[i][j] * B[k][j];
        result[i][k] = s;
    }
}

export function matTcrossprod(A: number[][], B: number[][]) {
    let result = times(A.length, Array, B.length) as number[][];
    matTcrossprodInto(result, A, B);
    return result
}

export function matAdd(A: number[][], B: number[][]) {
    let result = times(A.length, Array, A[0].length) as number[][];
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        result[i][j] = A[i][j]+B[i][j];
    return result;
}

export function matScale(A: number[][], b: number) {
    return A.map(row => row.map(value => value*b));
}

export function matScaleInto(A: number[][], b: number) {
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        A[i][j] *= b;
}

export function matAddInto(A: number[][], B: number[][]) {
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        A[i][j] += B[i][j];
}

export function matTranspose(A: number[][]) {
    let result = times(A[0].length, Array, A.length);
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        result[j][i] = A[i][j];
    return result as number[][];
}

export function removeSpin(motion: number[][], proj: number[][]) {
    /* Ensure each row of motion is in the null space of the rows of proj.
       proj rows are assumed to be orthonormal. 
       
       This is used to avoid adding random spin to the projection. */
    let result = [...motion];
    for(let i=0;i<result.length;i++)
    for(let j=0;j<proj.length;j++)
        result[i] = vecSub(result[i],vecScale(proj[j],vecDot(motion[i],proj[j])));
    
    return result;
}
