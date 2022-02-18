"use strict";

/*
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.13.0/dist/tf.min.js"></script>
<script src="https://unpkg.com/jstat@1.9.5/dist/jstat.js"></script>
<script src="https://unpkg.com/svd-js@1.1.1/build-umd/svd-js.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
*/

/**** Utility functions ****/

function rand_int(n) { 
    return Math.floor(Math.random()*n); 
}

function permutation(n) {
    let array = Array(n).fill().map((x,i)=>i);
    for (let i = array.length-1; i>0; i--) {
        const j = rand_int(i+1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function times(n, func, ...args) {
    let result = Array(n);
    for(let i=0;i<n;i++) result[i] = func(...args);
    return result;
}

function zeros(n) { return Array(n).fill(0); }

function vec_sub(a,b) {
    let result = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]-b[i];
    return result;
}

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



/**** Projection pursuit gradients ****/


function grad_bounce(proj, X, scale) {
    let k = 100;
    let A = Array(k);
    
    for(let i=0;i<k;i++) {
        A[i] = vec_sub(X[rand_int(X.length)],X[rand_int(X.length)]);
    }
    
    A = mat_scale(A, 1/scale);

    function objective(proj) {
        let projA = tf.matMul(proj, tf.transpose(A));
        
        let l = tf.pow(tf.add(tf.mul(projA,projA), 0.1**2), -0.5);
        return tf.mul(tf.sum(l), 2/k);
    }

    let grad_func = tf.grad(objective);
    
    function inner() {
        let grad = grad_func(tf.tensor(proj));
        
        // Don't spin.
        let rot_proj = tf.matMul([[0,-1/Math.sqrt(2)],[1/Math.sqrt(2),0]], proj);
        let dot = tf.sum(tf.mul(grad,rot_proj));
        grad = tf.sub(grad, tf.mul(rot_proj, dot));
        
        return grad.arraySync();
    }
    
    return tf.tidy(inner);
}



/**** Main class ****/

let template = `<div style="width: 100%; height: 100%; overflow-y: auto; border: 0;">
    <style>
    * { font-family: sans-serif; }
    input { vertical-align: middle; margin-right: 1em; }
    </style>

    <div style="position: relative" class=plot_div>
    <canvas class=canvas></canvas>
    <svg class=svg style="position: absolute; left:0; top:0;"></svg>
    </div>

    <div style="padding-left: 1em;">
    Axes<input class=axes_input type=checkbox checked>
    Local repulsion<input class=repulsion_input type=checkbox checked><br>
    Heat<input type=range min=-3 max=3 step=0.01 value=-1.2 class=temp_input>
    Damping<input type=range min=-1.5 max=1.5 step=0.01 value=-1 class=damp_input><br>
    <span class=message_area></span>
    </div>
</div>`;

class Langevitour {
    constructor(container, width, height) {
        this.container = container;
        this.shadow = this.container.attachShadow({mode: 'open'});
        this.shadow.innerHTML = template;
        
        this.container.tour = this; 
        // For debugging: document.querySelector('#htmlwidget_container>div').tour
        
        this.canvas = this.get('canvas');
        this.svg = this.get('svg');
        this.resize(width, height);
        
        this.svg.style.opacity = 0;
        this.get('plot_div').addEventListener('mouseover', () => { this.svg.style.opacity = 1; });
        this.get('plot_div').addEventListener('mouseout', () => { this.svg.style.opacity = 0; });
        
        this.X = null;
        this.n = 0;
        this.m = 0;
        
        
        this.fps = [ ];

        this.last_time = null;    
        this.scheduleFrame();    
    }
    
    get(className) {
        return this.shadow.firstChild.getElementsByClassName(className)[0];
    }
    
    renderValue(data) {
        //TODO: checking
        this.n = data.X.length;
        this.m = data.X[0].length;
        
        this.scale = data.scale || 4;

        // Shuffling is not optional.
        this.permutor = permutation(this.n);
        this.X = this.permutor.map(i => data.X[i]);
        this.colnames = data.colnames;
        
        this.levels = data.levels;
        this.groups = this.permutor.map(i => data.groups[i]);
        
        let n_groups = data.levels.length;
        this.fills = [ ];
        for(let i=0;i<this.n;i++) {
            let angle = (this.groups[i]+1/3)/n_groups;
            let value = 64*i/this.n+64;
            let r = value*(1+Math.cos(angle*Math.PI*2));
            let g = value*(1+Math.cos((angle+1/3)*Math.PI*2));
            let b = value*(1+Math.cos((angle+2/3)*Math.PI*2));
            this.fills[i] = `rgba(${r},${g},${b},0.75)`;
        }
        
        this.label_colors = [ ];
        for(let i=0;i<n_groups;i++) {
            let angle = (i+1/3)/n_groups;
            let value = 96;
            let r = value*(1+Math.cos(angle*Math.PI*2));
            let g = value*(1+Math.cos((angle+1/3)*Math.PI*2));
            let b = value*(1+Math.cos((angle+2/3)*Math.PI*2));
            this.label_colors[i] = `rgb(${r},${g},${b})`;
        }
        
        this.proj = zero_mat(2, this.m);
        this.proj[0][0] = 1;
        this.proj[1][1] = 1;
        this.vel = zero_mat(2, this.m);
        
        this.configure();
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;

        this.configure();
    }
    
    configure() {
        this.size = Math.max(50, Math.min(this.width-100, this.height-100));
        this.canvas.width = this.width;
        this.canvas.height = this.size;
        this.svg.style.width = this.width+'px';
        this.svg.style.height = this.size+'px';
        
        this.x_scale = d3.scaleLinear()
            .domain([-this.scale,this.scale]).range([2.5,this.size-2.5]).clamp(true);
        this.y_scale = d3.scaleLinear()
            .domain([-this.scale,this.scale]).range([2.5,this.size-2.5]).clamp(true);
        
        this.label_data = [ ];
        for(let i=0;i<this.m;i++) {
            this.label_data.push({ 
                index: i, 
                label:this.colnames[i], 
                x:(this.size+this.width)/2, y:35+i*40 
            });
        }

        let svg = d3.select(this.svg);
        let boxes = svg
            .selectAll('rect')
            .data(this.label_data)
            .join('rect')
            .attr('width', 60)
            .attr('height', 30)
            .attr('fill', '#ddd')
            .attr('rx', 10)
            .style('cursor','grab');
        let labels = svg
            .selectAll('text')
            .data(this.label_data)
            .join('text')
            .text(d=>d.label)
            .attr('text-anchor','middle')
            .attr('dominant-baseline','central')
            .style('cursor','grab');
    
        labels.each(function(d) { d.width = this.getBBox().width + 10; });
        boxes
            .attr('width', d=>d.width);

        function refresh_labels() {
            boxes
                .attr('x',d=>d.x-d.width/2)
                .attr('y',d=>d.y-15)
            labels
                .attr('x',d=>d.x)
                .attr('y',d=>d.y)
        }

        let drag = d3.drag()
            .on('drag', (event,d) => {
                d.x = event.x;
                d.y = event.y;
                refresh_labels();
            });
        drag(boxes);
        drag(labels);

        refresh_labels();
    }
    
    scheduleFrame() {
        window.requestAnimationFrame(this.doFrame.bind(this))
    }
    
    doFrame(time) {
        time /= 1000.0; //Convert to seconds
        
        if (this.X == null) {
            window.setTimeout(this.scheduleFrame.bind(this), 5); //TODO: do this nicer
            return;
        }
        
        if (this.last_time != null) {
            let elapsed = time - this.last_time;
            this.compute(elapsed);        
            
            this.fps.push( Math.floor(1/elapsed+0.5) );
            if (this.fps.length > 100) this.fps.shift();
            this.get('message_area').innerText = `${Math.min(...this.fps)} to ${Math.max(...this.fps)} FPS`;
        }
        this.last_time = time;
        
        let show_axes = this.get('axes_input').checked;
        
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0,0,this.width,this.height);
        
        let rx = this.x_scale.range(), ry = this.y_scale.range();
        ctx.strokeRect(rx[0],ry[0],rx[1]-rx[0],ry[1]-ry[0]);

        // Axes
        let axis_scale = this.scale * 0.75;
        ctx.strokeStyle = '#ccc';
        if (show_axes)
        for(let i=0;i<this.m;i++) {
            ctx.beginPath();
            ctx.moveTo(this.x_scale(-axis_scale*this.proj[0][i]), this.y_scale(-axis_scale*this.proj[1][i]));
            ctx.lineTo(this.x_scale(axis_scale*this.proj[0][i]), this.y_scale(axis_scale*this.proj[1][i]));
            ctx.stroke();
        }
        
        // Points
        let xy = mat_tcrossprod(this.proj, this.X);
        for(let i=0;i<this.n;i++) {
            ctx.fillStyle = this.fills[i];
            ctx.fillRect(this.x_scale(xy[0][i])-1.5, this.y_scale(xy[1][i])-1.5, 3, 3);
        }

        // Axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (show_axes)
        for(let i=0;i<this.m;i++) {
            let r = Math.sqrt(this.proj[0][i]*this.proj[0][i]+this.proj[1][i]*this.proj[1][i]);
            ctx.font = `15px sans-serif`;
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1,r*r*4)}`;
            ctx.fillText(this.colnames[i], this.x_scale(axis_scale*this.proj[0][i]), this.y_scale(axis_scale*this.proj[1][i]));
        }        
        
        //Legend
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '15px sens-serif';
        for(let i=0;i<this.levels.length;i++) {
            ctx.fillStyle = this.label_colors[i];
            ctx.fillText(this.levels[i], this.size+10, 20+i*20);
        }

        window.setTimeout(this.scheduleFrame.bind(this), 5);
    }
    
    compute(real_elapsed) {
        let damping = Math.pow(10, this.get('damp_input').value);
        let temperature = Math.pow(10, this.get('temp_input').value);

        let elapsed = Math.max(1e-6, Math.min(1, real_elapsed));
        
        let gamma = elapsed*damping;
        
        let vel = this.vel;
        let proj = this.proj;
        
        mat_scale_into(vel, 1-gamma);

        let noise = times(proj.length, times, this.m,
            jStat.normal.sample, 0, Math.sqrt(2*gamma*temperature));
        
        mat_add_into(vel, noise);

        if (this.get('repulsion_input').checked) {        
            let grad = grad_bounce(proj, this.X, this.scale);
            mat_scale_into(grad, -elapsed);
            mat_add_into(vel, grad);
        }
        
        for(let label of this.label_data) {
            if (label.x > this.size) continue;
            let x = this.x_scale.invert(label.x);
            let y = this.y_scale.invert(label.y);
            vel[0][label.index] += x*1;
            vel[1][label.index] += y*1;
        }
        
        let new_proj = mat_add(proj, mat_scale(vel, elapsed));
                
        let { u, v, q } = SVDJS.SVD(mat_transpose(new_proj));
        new_proj = mat_tcrossprod(v, u);
        
        // "Position based dynamics"
        this.vel = mat_scale(mat_add(new_proj,mat_scale(proj,-1)), 1/elapsed);
        this.proj = new_proj;
    }
}
