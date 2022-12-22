/* "Guide" gradients for projection pursuit.

   A guide is defined by a potential energy function.
   
   The only thing that matters for the guide is the gradient of this function.
 */
import { vecSub, vecDot, zeroMat, randInt, matScaleInto } from './math.js';
/*
I tried TensorFlow (tfjs) for gradients, but in the end did them by hand.


function gradRepulsion(proj, X, power, fineScale) {
    let k = 1000;
    let A = Array(k);
    
    for(let i=0;i<k;i++) {
        A[i] = vecSub(X[randInt(X.length)],X[randInt(X.length)]);
    }

    function objective(proj) {
        let projA = tf.matMul(proj, tf.transpose(A));
        
        let l = tf.sum(tf.mul(projA,projA),0)
        
        l = tf.add(l, fineScale**2);
        
        if (power == 0)
            l = tf.log(l)
        else
            l = tf.div(tf.pow(l,power),power);
        
        return tf.mul(tf.sum(l), -1/k);
    }

    let gradFunc = tf.grad(objective);
    
    function inner() {
        let grad = gradFunc(tf.tensor(proj));
        
        // Don't spin.
        let rotProj = tf.matMul([[0,-1/Math.sqrt(2)],[1/Math.sqrt(2),0]], proj);
        let dot = tf.sum(tf.mul(grad,rotProj));
        grad = tf.sub(grad, tf.mul(rotProj, dot));
        
        return grad.arraySync();
    }
    
    return tf.tidy(inner);
}
*/
export function gradRepulsion(proj, X, power, fineScale, strength) {
    /*
    Ideally we would perform repulsion between all pairs of points. However this would be O(n^2). Instead we only do a fraction of this -- it's a stochastic gradient.
    
    Unfortunately this means there is a little jitter even if heat is completely turned off.
    */
    let iters = 5000;
    let m = proj.length, n = proj[0].length;
    let p = Array(m);
    let grad = zeroMat(m, n);
    let off1 = randInt(X.length);
    let off2 = randInt(X.length);
    for (let i = 0; i < iters; i++) {
        let a = vecSub(X[(i + off1) % X.length], X[(i + off2) % X.length]);
        for (let j = 0; j < m; j++)
            p[j] = vecDot(a, proj[j]);
        let scale = Math.pow((vecDot(p, p) + fineScale * fineScale), (power - 1));
        for (let j = 0; j < m; j++)
            for (let k = 0; k < n; k++)
                grad[j][k] += a[k] * p[j] * scale;
    }
    matScaleInto(grad, -2 / iters * strength);
    return grad;
}
export function gradCentralRepulsion(proj, X, power, fineScale, strength) {
    let m = proj.length, n = proj[0].length;
    let p = Array(m);
    let grad = zeroMat(m, n);
    for (let i = 0; i < X.length; i++) {
        let a = X[i];
        for (let j = 0; j < m; j++)
            p[j] = vecDot(a, proj[j]);
        let scale = Math.pow((vecDot(p, p) + fineScale * fineScale), (power - 1));
        for (let j = 0; j < m; j++)
            for (let k = 0; k < n; k++)
                grad[j][k] += a[k] * p[j] * scale;
    }
    matScaleInto(grad, -2 / X.length * strength);
    return grad;
}
/*
export function gradSparseRank(proj, strength) {
    let m = proj.length, n = proj[0].length;
    let mag2 = zeros(n);
    for(let i=0;i<m;i++)
        for(let j=0;j<n;j++)
            mag2[j] += proj[i][j]**2;
            
    let order = [...Array(n).keys()];
    order.sort((i,j) => mag2[j]-mag2[i]);
    
    let grad = zeroMat(m,n);
    for(let j=0;j<3;j++)
        for(let i=0;i<m;i++)
            grad[i][order[j]] = -strength*proj[i][order[j]];
    
    return grad;
}
*/
export let gradTable = {
    //Not quite working well.
    //Better to manually hide all but 3 axes.
    //"sparse": (proj,X) => gradSparseRank(proj, 0.1),
    "ultralocal": (proj, X) => gradRepulsion(proj, X, -1, 0.05, 0.01),
    "local": (proj, X) => gradRepulsion(proj, X, 0, 0.01, 0.5),
    "pca": (proj, X) => gradRepulsion(proj, X, 1, 0, 0.5),
    "outlier": (proj, X) => gradRepulsion(proj, X, 2, 0, 5),
    "push": (proj, X) => gradCentralRepulsion(proj, X, 0.5, 0.01, 0.5),
    "pull": (proj, X) => gradCentralRepulsion(proj, X, 0.5, 0.01, -0.2),
};
//# sourceMappingURL=guides.js.map