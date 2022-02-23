"use strict";

/*
<script src="https://unpkg.com/jstat@1.9.5/dist/jstat.js"></script>
<script src="https://unpkg.com/svd-js@1.1.1/build-umd/svd-js.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<!-- <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.13.0/dist/tf.min.js"></script> -->
*/

let langevitour = (function(){

/**** Utility functions ****/

function elementVisible(el) {
    //https://stackoverflow.com/a/22480938
    
    let rect = el.getBoundingClientRect();
    let elemTop = rect.top;
    let elemBottom = rect.bottom;

    // Only completely visible elements return true:
    //return (elemTop >= 0) && (elemBottom <= window.innerHeight);
    
    // Partially visible elements return true:
    return elemTop < window.innerHeight && elemBottom >= 0;
}

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

function vec_add(a,b) {
    let result = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]+b[i];
    return result;
}

function vec_dot(a,b) {
    let result = 0;
    for(let i=0;i<a.length;i++) result += a[i]*b[i];
    return result;
}

function vec_scale(a,b) {
    let result = Array(a.length);
    for(let i=0;i<result.length;i++) result[i] = a[i]*b;
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

/*
function gradRepulsion(proj, X, power, fine_scale) {
    let k = 1000;
    let A = Array(k);
    
    for(let i=0;i<k;i++) {
        A[i] = vec_sub(X[rand_int(X.length)],X[rand_int(X.length)]);
    }

    function objective(proj) {
        let projA = tf.matMul(proj, tf.transpose(A));
        
        let l = tf.sum(tf.mul(projA,projA),0)
        
        l = tf.add(l, fine_scale**2);
        
        if (power == 0)
            l = tf.log(l)
        else
            l = tf.div(tf.pow(l,power),power);
        
        return tf.mul(tf.sum(l), -1/k);
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
*/

function removeSpin(motion, proj) {
    let rot_proj = mat_mul([[0,-1/Math.sqrt(2)],[1/Math.sqrt(2),0]], proj);
    let dot = 0;
    for(let i=0;i<proj.length;i++)
    for(let j=0;j<proj[0].length;j++)
        dot += motion[i][j]*rot_proj[i][j];
    
    return mat_add(motion, mat_scale(rot_proj, -dot));
}

function gradRepulsion(proj, X, power, fine_scale) {
    let iters = 1000;
    let m = proj.length, n = proj[0].length;
    let p = [ ];
    let grad = zero_mat(m,n);
    
    for(let i=0;i<iters;i++) {
        let a = vec_sub(X[rand_int(X.length)],X[rand_int(X.length)]);
        
        for(let j=0;j<m;j++)
            p[j] = vec_dot(a, proj[j]);
        
        let scale = (vec_dot(p,p)+fine_scale)**(power-1);
        
        for(let j=0;j<m;j++)
        for(let k=0;k<n;k++)
            grad[j][k] += a[k] * p[j] * scale;
    }
    
    mat_scale_into(grad, -2/iters);
    
    return removeSpin( grad, proj );
}


/**** Main class ****/

let template = `<div>
    <style>
    /* Reset all host styling. */
    :host {
        all: initial;
    }
    
    * { font-family: sans-serif; }
    input { vertical-align: middle; }
    
    .box { 
        background: #eee;
        display: inline-block; 
        padding: 0.25em 0.5em 0.25em 0.5em; 
        margin: 0.25em; 
        border-radius: 0.25em;
        vertical-align: middle;
    }
    
    .fullscreenButton {
        margin: 0.25em 0.5em 0.25em 1em;
        padding: 0px;
        vertical-align: middle;
    }
    </style>

    <div style="position: relative" class=plotDiv>
        <canvas class=canvas></canvas>
        <svg class=svg style="position: absolute; left:0; top:0;">
            <g class=labelGroup></g>
            <text class=messageArea></text>
        </svg>
    </div>

    <div class=controlDiv>
        <button class=fullscreenButton title="Full screen"
            ><svg  width=20 height=20 version="1.1" viewBox="7 7 22 22" style="vertical-align: middle;">
            <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z"></path>
            <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z"></path>
            <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z"></path>
            <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z"></path>
            </svg
        ></button
        
        ><div class=box>Axes<input class=axesCheckbox type=checkbox checked></div
        
        ><div class=box>Damping<input type=range min=-3 max=3 step=0.01 value=0 class=dampInput></div
        
        ><div class=box>Heat<input class=tempCheckbox type=checkbox checked><input type=range min=-2 max=4 step=0.01 value=0 class=tempInput></div
        
        ><br/
        
        ><div class=box>
        Point repulsion
        <select class=repulsionSelect value=none>
            <option value=none>none</option>
            <option value=local>local</option>
            <option value=pca>PCA</option>
            <option value=outlier>outlier</option>
        </select> 
        <input type=range min=-2 max=2 step=0.01 value=0 class=repulsionInput></div
        
        ><div class=box>Label attraction<input class=labelCheckbox type=checkbox checked><input type=range min=-3 max=1 step=0.01 value=0 class=labelInput></div
    ></div>
</div>`;

let repulsionTable = {
    "local": {amount:0.5, power:0, fine_scale:0.01},
    "pca": {amount:0.5, power:1, fine_scale:0},
    "outlier": {amount:5, power:2, fine_scale:0},
};

class Langevitour {
    constructor(container, width, height) {
        /* Set up elements in a shadow DOM to isolate from document style. */
        this.container = container;
        this.shadow = this.container.attachShadow({mode: 'open'});
        this.shadow.innerHTML = template;
        this.canvas = this.get('canvas');
        this.svg = this.get('svg');
        
        this.X = null;
        this.n = 0;
        this.m = 0;
        this.levels = [ ];

        this.running = false;
        this.last_time = 0;
        this.dragging = false;
        this.fps = [ ];

        this.resize(width, height);
        
        /* svg overlay only appears when mouse in plot area */
        this.mousing = false;
        this.get('plotDiv').addEventListener('mouseover', () => { this.mousing = true; });
        this.get('plotDiv').addEventListener('mouseout', () => { this.mousing = false; });
        
        /* Hide fullscreen button if not available */
        if (this.container.requestFullscreen == null)
            this.get('fullscreenButton').style.display = 'none';
        
        /* Handle fullscreen */
        this.get('fullscreenButton').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.shadow.firstChild.requestFullscreen();
            } else if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        });
        
        this.shadow.firstChild.addEventListener('fullscreenchange', () => { 
            let el = this.shadow.firstChild;
            if (document.fullscreenElement) {
                this.originalWidth = this.width;
                this.originalHeight = this.height;
                let pad = Math.max(0, el.offsetWidth-el.offsetHeight)/2;
                el.style.paddingLeft = pad+'px';
                this.width = el.offsetWidth-pad;
                this.height = el.offsetHeight;
                this.configure();
            } else {
                el.style.paddingLeft = '0px';
                this.width = this.originalWidth;
                this.height = this.originalHeight;
                this.configure();
            }
        });
    }
    
    get(className) {
        return this.shadow.firstChild.getElementsByClassName(className)[0];
    }
    
    renderValue(data) {
        //TODO: checking
        this.n = data.X.length;
        this.m = data.X[0].length;
        
        // data.X is assumed already centered and scaled. 
        // These allow us to recover the original values:
        this.center = data.center || Array(this.m).fill(0);
        this.scale = data.scale || Array(this.m).fill(1);
        
        // Shuffling is not optional.
        this.permutor = permutation(this.n);
        this.X = this.permutor.map(i => data.X[i]);
        this.colnames = data.colnames;
        
        this.levels = data.levels;
        this.group = this.permutor.map(i => data.group[i]);
        
        let n_groups = this.levels.length;
        this.fills = [ ];
        for(let i=0;i<this.n;i++) {
            let angle = (this.group[i]+1/3)/n_groups;
            let value = 64*i/this.n+64;
            let r = value*(1+Math.cos(angle*Math.PI*2));
            let g = value*(1+Math.cos((angle+1/3)*Math.PI*2));
            let b = value*(1+Math.cos((angle+2/3)*Math.PI*2));
            this.fills[i] = `rgb(${r},${g},${b})`;
        }
        
        this.levelColors = [ ];
        for(let i=0;i<n_groups;i++) {
            let angle = (i+1/3)/n_groups;
            let value = 96;
            let r = value*(1+Math.cos(angle*Math.PI*2));
            let g = value*(1+Math.cos((angle+1/3)*Math.PI*2));
            let b = value*(1+Math.cos((angle+2/3)*Math.PI*2));
            this.levelColors[i] = `rgb(${r},${g},${b})`;
        }
        
        this.proj = zero_mat(2, this.m);
        this.proj[0][0] = 1;
        this.proj[1][1] = 1;
        this.vel = zero_mat(2, this.m);
        
        
        if (!this.running) {
            this.scheduleFrame();
            this.running = true;
        }
        
        this.configure();        
    }
    
    resize(width, height) {
        // At least in pkgdown vignettes, we get weird resize requests while fullscreen.
        if (document.fullscreenElement) return;
        
        this.width = Math.max(200, width);
        this.height = Math.max(200, height);
        
        this.configure();
    }
    
    configure() {
        if (!this.running) return;
        
        this.canvas.width = this.width;
        this.svg.style.width = this.width+'px';

        // Scrollbars will appear if very small
        let controlHeight = this.get('controlDiv').offsetHeight + 5;
        this.size = Math.max(100, Math.min(this.width-100, this.height-controlHeight));

        this.canvas.height = this.size;
        this.svg.style.height = this.size+'px';
        
        d3.select(this.get('messageArea'))
            .attr('x',this.width-10)
            .attr('y',this.size)
            .attr('text-anchor','end')
            .style('dominant-baseline','bottom');
        
        this.xScale = d3.scaleLinear()
            .domain([-1,1]).range([2.5,this.size-2.5]).clamp(true);
        this.yScale = d3.scaleLinear()
            .domain([-1,1]).range([2.5,this.size-2.5]).clamp(true);

        //Draggable labels
        
        this.labelData = [ ];
        
        if (this.levels.length > 1)
        for(let i=0;i<this.levels.length;i++) {
            let vec = zeros(this.m);
            for(let j=0;j<this.n;j++)
                if (this.group[j] == i)
                    vec = vec_add(vec, this.X[j]);
            vec = vec_scale(vec, 1/Math.sqrt(vec_dot(vec,vec)));            
            
            this.labelData.push({
                type: 'level',
                level: i,
                label: this.levels[i], 
                vec: vec,
                color: this.levelColors[i]
            });
        }

        for(let i=0;i<this.m;i++) {
            let vec = zeros(this.m);
            vec[i] = 1;
            this.labelData.push({ 
                type:'variable',
                variable: i,
                label:this.colnames[i], 
                vec: vec,
                color: '#000',
            });
        }
        
        let rows = Math.max(1,Math.floor((this.size-25)/25)), 
            cols=Math.ceil(this.labelData.length/rows);
        for(let i=0;i<this.labelData.length;i++) {
            let row = i % rows, col = (i-row)/rows;
            this.labelData[i].index = i;
            this.labelData[i].selected = false;
            this.labelData[i].x = this.size+10+col*(this.width-this.size)/cols;
            this.labelData[i].y = 20+row*25;
        }
        
        this.labelData.reverse();
        
        let svg = d3.select(this.svg).select('.labelGroup');
        
        svg.selectAll('*').remove();
        
        let gs = svg
            .selectAll('g')
            .data(this.labelData)
            .join(
                enter => {
                    let g = enter.append('g');
                    g.append('rect');
                    g.append('text');
                    return g;
                }
            );
        
        let boxes = gs.selectAll('rect');
        
        let labels = gs.select('text')
            .text(d=>d.label)
            .style('fill',d=>d.color)
            .attr('text-anchor','middle')
            .attr('dominant-baseline','central')
            .style('cursor','grab')
            .style('user-select','none')
            .on('mouseover', (e,d)=>{ d.selected += 1; refresh_labels(); })
            .on('mouseout', (e,d)=>{ d.selected -= 1; refresh_labels(); });
    
        labels.each(function(d) { 
            d.width = this.getBBox().width + 10; 
            d.x += d.width/2;
        });
        
        boxes
            .attr('width', d=>d.width)
            .attr('height', 20)
            .attr('rx', 5)
            .style('cursor','grab')
            .on('mouseover', (e,d)=>{ d.selected += 1; refresh_labels(); })
            .on('mouseout', (e,d)=>{ d.selected -= 1; refresh_labels(); });

        let thys = this; //sigh

        function refresh_labels() {
            for(let item of thys.labelData) {
                item.x = Math.max(0,Math.min(thys.width, item.x));
                item.y = Math.max(0,Math.min(thys.size, item.y));
            }
            
            boxes
                .attr('x',d=>d.x-d.width/2)
                .attr('y',d=>d.y-10)
                .attr('fill',d=>d.selected?'#aaa':'#ddd')
            labels
                .attr('x',d=>d.x)
                .attr('y',d=>d.y)
        }

        let drag = d3.drag()
            .on('start', function(e,d) {
                thys.dragging = true;
                this.style.cursor = 'grabbing';
                d.selected += 1;
            })
            .on('drag', (e,d) => {
                d.x = e.x;
                d.y = e.y;
                refresh_labels();
            })
            .on('end', function(e,d) {
                thys.dragging = false;
                this.style.cursor = 'grab';
                d.selected -= 1;
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

        let elapsed = time - this.last_time;
        this.last_time = time;
        
        if (this.X == null || !elementVisible(this.canvas)) {
            // We aren't visible. Wait a while.
            window.setTimeout(this.scheduleFrame.bind(this), 100);
            return;
        }
        
        this.compute(elapsed);
        
        this.fps.push( Math.floor(1/elapsed+0.5) );
        if (this.fps.length > 100) this.fps.shift();
        d3.select(this.get('messageArea')).text( `${Math.min(...this.fps)} to ${Math.max(...this.fps)} FPS` );

        let selected = this.labelData.filter(d=>d.selected)[0];
        let selectedVar = null;
        if (selected != null && selected.type == 'variable')
            selectedVar = selected.variable;
        
        let showAxes = this.get('axesCheckbox').checked;        
                
        this.svg.style.opacity = this.mousing?1:0;

        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0,0,this.width,this.height);
        
        let rx = this.xScale.range(), ry = this.yScale.range();
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.fillRect(rx[0],ry[0],rx[1]-rx[0],ry[1]-ry[0]);
        ctx.strokeRect(rx[0],ry[0],rx[1]-rx[0],ry[1]-ry[0]);

        // Axes
        let axisScale = 0.75;
        ctx.strokeStyle = '#ccc';
        
        if (showAxes)
        for(let i=0;i<this.m;i++) {
            ctx.beginPath();
            ctx.moveTo(this.xScale(-axisScale*this.proj[0][i]), this.yScale(-axisScale*this.proj[1][i]));
            ctx.lineTo(this.xScale(axisScale*this.proj[0][i]), this.yScale(axisScale*this.proj[1][i]));
            ctx.stroke();
        }

        // Points
        let xy = mat_tcrossprod(this.proj, this.X);

        let fills = this.fills;
        if (selected != null) {
            fills = [ ];
            for(let i=0;i<this.n;i++)
                if (selected.type == 'level')
                    if (this.group[i] == selected.level)
                        fills[i] = this.fills[i]
                    else
                        fills[i] = '#00000022';
                else {
                    let c = this.X[i][selected.variable];
                    c = Math.tanh(c * 2);                            // Hmm
                    fills[i] = d3.interpolateViridis(c*0.5+0.5);
                }
        }
        
        for(let i=0;i<this.n;i++) {
            ctx.fillStyle = fills[i];
            ctx.fillRect(this.xScale(xy[0][i])-1.5, this.yScale(xy[1][i])-1.5, 3, 3);
        }
        
        // Rug
        if (showAxes && selectedVar != null) {
            //ctx.strokeStyle = '#00000022';

            let ox = [ this.proj[1][selectedVar], -this.proj[0][selectedVar] ];
            ox = vec_scale(ox, 0.05/Math.sqrt(vec_dot(ox,ox)));
            for(let i=0;i<this.n;i++) {
                let p = [ 
                    this.proj[0][selectedVar] * this.X[i][selectedVar], 
                    this.proj[1][selectedVar] * this.X[i][selectedVar] ];                
                let pA = vec_add(p, ox);
                let pB = vec_add(p, vec_scale(ox,-1));
                
                ctx.strokeStyle = fills[i];
                ctx.beginPath();
                ctx.moveTo(this.xScale(pA[0]),this.yScale(pA[1]));
                ctx.lineTo(this.xScale(pB[0]),this.yScale(pB[1]));
                ctx.stroke();
            }
        }
                
        // Axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save()
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
                
        if (showAxes)
        for(let i=0;i<this.m;i++) {
            let r2 = this.proj[0][i]*this.proj[0][i]+this.proj[1][i]*this.proj[1][i];
            let alpha = (i==selectedVar ? 1 : Math.min(1,r2*2));
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillStyle = `rgba(0,0,0,${alpha})`;

            if (i==selectedVar) {
                let ticks = d3.scaleLinear()
                    .domain([this.center[i]-this.scale[i]*axisScale, this.center[i]+this.scale[i]*axisScale])
                    .range([-axisScale,axisScale])
                    .ticks(5);
                ctx.font = `12px sans-serif`;
                for(let value of ticks) {
                    let scaled = (value-this.center[i])/this.scale[i];
                    ctx.strokeText(`${value}`, this.xScale(scaled*this.proj[0][i]), this.yScale(scaled*this.proj[1][i]));    
                    ctx.fillText(`${value}`, this.xScale(scaled*this.proj[0][i]), this.yScale(scaled*this.proj[1][i]));    
                }
            }
            
            ctx.font = `15px sans-serif`;
            ctx.strokeText(this.colnames[i], this.xScale(axisScale*this.proj[0][i]), this.yScale(axisScale*this.proj[1][i]));
            ctx.fillText(this.colnames[i], this.xScale(axisScale*this.proj[0][i]), this.yScale(axisScale*this.proj[1][i]));
        }
        
        ctx.restore();

        //Legend
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '15px sans-serif';
        if (!this.mousing)
        for(let i=0;i<this.levels.length;i++) {
            ctx.fillStyle = this.levelColors[i];
            ctx.fillText(this.levels[i], this.size+10, 10+i*20);
        }
        
        window.setTimeout(this.scheduleFrame.bind(this), 5);
        //this.scheduleFrame();
    }
    
    compute(real_elapsed) {
        let damping =     0.2  *Math.pow(10, this.get('dampInput').value);
        let temperature = 0.02 *Math.pow(10, this.get('tempInput').value);
        let repulsion =   1.0  *Math.pow(10, this.get('repulsionInput').value);
        let attraction =  1.0  *Math.pow(10, this.get('labelInput').value);
        let doTemp = this.get('tempCheckbox').checked;
        let whatRepulsion = this.get('repulsionSelect').value;
        let doAttraction = this.get('labelCheckbox').checked;

        // Cut down oscillation during dragging
        if (this.dragging && doAttraction) {
            damping = Math.max(damping, attraction*5.0);
        }

        let elapsed = Math.max(1e-6, Math.min(1, real_elapsed));
        
        let vel = this.vel;
        let proj = this.proj;
        
        //mat_scale_into(vel, 1-elapsed*damping);        
        //Integrate dv/dt = -damping * v
        mat_scale_into(vel, Math.exp(-elapsed*damping));

        if (doTemp) {
            let noise = times(proj.length, times, this.m,
                jStat.normal.sample, 0, Math.sqrt(2*temperature*elapsed));
            
            noise = removeSpin(noise, proj);
            
            mat_add_into(vel, noise);
        }

        if (whatRepulsion != 'none') {
            let options = repulsionTable[whatRepulsion];
            let grad = gradRepulsion(proj, this.X, options.power, options.fine_scale);
            mat_scale_into(grad, -1*options.amount*repulsion);
            mat_add_into(vel, grad);
        }

        if (doAttraction)        
        for(let label of this.labelData) {
            if (label.x > this.size) continue;
            let x = this.xScale.invert(label.x);
            let y = this.yScale.invert(label.y);
            if (x <= -1 || y <= -1 || x >= 1 || y >= 1) continue;
            let adjustment = 4*(x*x+y*y);
            vel[0] = vec_add(vel[0], vec_scale(label.vec, x*adjustment*attraction));
            vel[1] = vec_add(vel[1], vec_scale(label.vec, y*adjustment*attraction));
        }
        
        let new_proj = mat_add(proj, mat_scale(vel, elapsed));
                
        let { u, v, q } = SVDJS.SVD(mat_transpose(new_proj));
        new_proj = mat_tcrossprod(v, u);
        
        // "Position based dynamics"
        this.vel = mat_scale(mat_add(new_proj,mat_scale(proj,-1)), 1/elapsed);
        this.proj = new_proj;
    }
}

return { Langevitour };
})();

