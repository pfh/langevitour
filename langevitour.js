
/*
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.13.0/dist/tf.min.js"></script>
<script src="https://unpkg.com/jstat@1.9.5/dist/jstat.js"></script>
<script src="https://unpkg.com/svd-js@1.1.1/build-umd/svd-js.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
*/

/**** Utility functions ****/

function times(n, func, ...args) {
    let result = Array(n);
    for(let i=0;i<n;i++) result[i] = func(...args);
    return result;
}

function zeros(n) { return Array(n).fill(0); }

function zero_mat(n,m) { return times(n,zeros,m); }

function mat_mul_into(result, A, B) {
    let a = A.length, b = A[0].length, c = B[0].length;
    for(let i=0;i<a;i++)
    for(let k=0;k<c;k++)
        result[i][k] = 0;
    
    for(let i=0;i<a;i++)
    for(let j=0;j<b;j++)
    for(let k=0;k<c;k++)
        result[i][k] += A[i][j] * B[j][k];
    return result;
}

function mat_mul(A,B) {
    let result = times(A.length, ()=>Array(B[0].length));
    mat_mul_into(result, A, B);
    return result
}

function mat_tcrossprod_into(result, A, B) {
    let a = A.length, b = A[0].length, c = B.length;
    for(let i=0;i<a;i++)
    for(let k=0;k<c;k++)
        result[i][k] = 0;
    
    for(let i=0;i<a;i++)
    for(let j=0;j<b;j++)
    for(let k=0;k<c;k++)
        result[i][k] += A[i][j] * B[k][j];
    return result;
}

function mat_tcrossprod(A,B) {
    let result = times(A.length, Array, B.length);
    mat_tcrossprod_into(result, A, B);
    return result
}

function mat_add(A,B) {
    let result = times(A.length, ()=>Array(A[0].length));
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        result[i][j] = A[i][j]+B[i][j];
    return result;
}

function mat_scale(A,b) {
    return A.map(row => row.map(value => value*b));
}

function mat_scale_into(A,b) {
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        A[i][j] *= b;
}

function mat_add_into(A,B) {
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        A[i][j] += B[i][j];
}

function mat_transpose(A) {
    let result = times(A[0].length, Array, A.length);
    for(let i=0;i<A.length;i++)
    for(let j=0;j<A[0].length;j++)
        result[j][i] = A[i][j];
    return result;
}


function now() { 
    return new Date().getTime()/1000; 
}



/**** Main class ****/

let template = `
<div style="position: relative">
  <canvas class=canvas></canvas>
  <svg class=svg style="position: absolute; left:0; top:0;"></svg>
</div>

<p>
<b>Temperature</b>
<br><input type="range" min="-3" max="3" step="0.01" value="-1.2" class=temp_input>
<p>
<b>Damping amount</b>
<br><input type="range" min="-1.5" max="1.5" step="0.01" value="-1" class=damp_input>

<p id="fps">
`;

class Langevitour {
    constructor(container, width, height) {
        this.container = container;
        //this.shadow = this.container.attachShadow({mode: 'open'});
        this.container.innerHTML = template;
        
        this.container.tour = this; 
        // For debugging: document.querySelector('#htmlwidget_container>div').tour
        
        this.canvas = this.get('canvas');
        this.svg = this.get('svg');
        this.resize(width, height);
        
        this.X = null;
        this.n = 0;
        this.m = 0;
        
        this.active = false;
        
        this.activate();
        
        window.addEventListener('focus', ()=>this.activate());
    }
    
    get(className) {
        return this.container.getElementsByClassName(className)[0];
    }
    
    renderValue(data) {
        //TODO: checking
        this.X = data.X;
        this.n = data.X.length;
        this.m = data.X[0].length;
        
        this.proj = zero_mat(2, this.m);
        this.proj[0][0] = 1;
        this.proj[1][1] = 1;
        this.vel = zero_mat(2, this.m);
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.svg.style.width = width;
        this.svg.style.height = height;
        
        this.size = Math.min(width * 0.8, height);
        this.x_scale = d3.scaleLinear().domain([-3,3]).range([this.size*0.1,this.size*0.9]);
        this.y_scale = d3.scaleLinear().domain([-3,3]).range([this.size*0.1,this.size*0.9]);
    }
    
    activate() {
        if (!this.active && this.X != null) {
            this.active = true;
            this.last_time = now();
            this.do_frame();
        }
    }
    
    do_frame() {
        if (!document.hasFocus() || this.X == null) {
            this.active = false;
            return;
        }
        
        this.compute();
        
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0,0,this.width,this.height);
        ctx.strokeRect(0.5,0.5,this.size-1,this.size-1);
        
        let xy = mat_tcrossprod(this.proj, this.X);
        for(let i=0;i<this.n;i++) {
            //ctx.fillStyle = fills[i];
            ctx.fillRect(this.x_scale(xy[0][i])-1, this.y_scale(xy[1][i])-1, 2, 2);
        }

        window.setTimeout(()=>this.do_frame(), 5);
    }
    
    compute() {
        let damping = Math.pow(10, this.get('damp_input').value);
        let temperature = Math.pow(10, this.get('temp_input').value);

        let now_time = now();
        let real_elapsed = now_time-this.last_time;
        let elapsed = Math.max(1e-6, Math.min(0.5, real_elapsed));
        this.last_time = now_time;
        
        let gamma = elapsed*damping;
        
        let vel = this.vel;
        let proj = this.proj;
        
        mat_scale_into(vel, 1-gamma);

        let noise = times(proj.length, times, this.m,
            jStat.normal.sample, 0, Math.sqrt(2*gamma*temperature));
        
        mat_add_into(vel, noise);
        
        //let grad = grad_func(proj);
        //mat_scale_into(grad, -elapsed);
        //mat_add_into(vel, grad);
        
        //for(let label of d3_data) {
        //    if (label.x > 600) continue;
        //    let x = (label.x-300)/600;
        //    let y = (label.y-300)/600;
        //    vel[0][label.index] += x*1;
        //    vel[1][label.index] += y*1;
        //}
        
        let new_proj = mat_add(proj, mat_scale(vel, elapsed));
                
        let { u, v, q } = SVDJS.SVD(mat_transpose(new_proj));
        new_proj = mat_tcrossprod(v, u);
        
        // "Position based dynamics"
        this.vel = mat_scale(mat_add(new_proj,mat_scale(proj,-1)), 1/elapsed);
        this.proj = new_proj;
    }
}
