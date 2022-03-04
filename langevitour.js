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

function hex_byte(value) {
    value = Math.max(0,Math.min(255,Math.round(value)));
    return (value<16?'0':'')+value.toString(16);
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
    input[type=checkbox] { vertical-align: baseline; }
    
    .box { 
        background: #eee;
        display: inline-block; 
        padding: 0.25em 0.5em 0.25em 0.5em; 
        margin: 0.25em; 
        border-radius: 0.25em;
        vertical-align: middle;
    }
    
    button {
        margin: 0.25em 0.25em 0.25em 0.25em;
        padding: 0px;
        vertical-align: middle;
        height: 24px;
        width: 24px;
    }
    
    .infoBox {
        visibility: hidden;
        position: absolute;
        left: 10px;
        bottom: 0px;
        padding: 1em;
        background: #fff;
        border: 1px solid black;
        border-radius: 0.25em;
    }
    
    .messageArea {
        position: absolute;
        white-space: pre;
        text-align: right;
        right: 3px;
        bottom: 3px;
        color: #888;
    }
    
    .labelDiv {
        white-space: nowrap;
        position: absolute;
        border-radius: 3px;
        padding: 2px 5px 1px 0px;
        cursor: grab;  
        user-select: none;
        font-size: 15px;
    }
    
    .labelDiv input {
        padding: 0px;
        margin: 0px 5px 0px 0px;
    }
    
    </style>

    <div style="position: relative" class=plotDiv>
        <canvas class=canvas></canvas>
        <div class=messageArea></div>
        <div class=overlay style="position: absolute; left:0; top:0;"></div>
        <div class=infoBox>
            <div><b><a href="https://logarithmic.net/langevitour/">langevitour</a></b></div>
            <div class=infoBoxInfo></div>
            <div>Projection:</div>
            <textarea class=infoBoxProj rows=6 cols=30 wrap=off></textarea>
        </div>
    </div>

    <div class=controlDiv>
        <button class=fullscreenButton title="Full screen"
            ><svg  width=20 height=20 version="1.1" viewBox="7 7 22 22" style="vertical-align: middle;">
            <path d="M 10,16 l 2,0 l 0,-4 l 4,0 l 0,-2 L 10,10 l 0,6 l 0,0 z"></path>
            <path d="M 20,10 l 0,2 l 4,0 l 0,4 l 2,0 L 26,10 l -6,0 l 0,0 z"></path>
            <path d="M 24,24 l -4,0 l 0,2 L 26,26 l 0,-6 l -2,0 l 0,4 l 0,0 z"></path>
            <path d="M 12,20 L 10,20 L 10,26 l 6,0 l 0,-2 l -4,0 l 0,-4 l 0,0 z"></path>
            </svg
        ></button
        
        ><button class=infoButton>
            ?
        </button
        
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
        this.overlay = this.get('overlay');
        
        this.X = null;
        this.n = 0;
        this.m = 0;
        this.levels = [ ];

        this.running = false;
        this.last_time = 0;
        this.dragging = false;
        this.fps = [ ];
        
        this.computeMessage = '';

        this.resize(width, height);
        
        /* svg overlay only appears when mouse in plot area */
        this.mousing = false;
        this.mouseX = 0;
        this.mouseY = 0;
        let plotDiv = this.get('plotDiv');
        plotDiv.addEventListener('mouseover', (e) => { 
            this.mousing = true; 
        });
        plotDiv.addEventListener('mouseout', (e) => { 
            this.mousing = false; 
        });
        plotDiv.addEventListener('mousemove', (e) => { 
            let rect = plotDiv.getBoundingClientRect();
            this.mouseX = e.x - rect.left;
            this.mouseY = e.y - rect.top;
        });
        
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
        
        /* Info box */
        this.get('infoButton').addEventListener('click', () => {
            let el = this.get('infoBox');
            if (el.style.visibility == 'visible') {
                el.style.visibility = 'hidden';
            } else {
                el.style.visibility = 'visible';
                
                let matStr = 'projection <- cbind(\n    c(';
                matStr += this.proj.map(line => line.map(
                        (item,i) => (item/this.scale[i]).toFixed( Math.ceil(Math.log10(Math.max(0,this.scale[i]))+4) )
                    ).join(',')).join('),\n    c(');
                matStr += '))\nprojected <- as.matrix(X) %*% projection';
                
                this.get('infoBoxProj').value = matStr;
            
                this.get('infoBoxInfo').innerHTML = `<p>${this.X.length.toLocaleString("en-US")} points.</p>`;
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
        
        this.pointSize = data.pointSize != null ? data.pointSize : 1;
        
        let axisColors = data.axisColors || [];
        
        // data.X is assumed already centered and scaled. 
        // These allow us to recover the original values:
        this.center = data.center || Array(this.m).fill(0);
        this.scale = data.scale || Array(this.m).fill(1);
        
        // Shuffling is not optional.
        this.permutor = permutation(this.n);
        this.X = this.permutor.map(i => data.X[i]);
        
        if (!data.rownames || data.rownames.length == 0) 
            this.rownames = null;
        else
            this.rownames = this.permutor.map(i => data.rownames[i]);
        
        this.colnames = data.colnames;
        
        this.axes = [ ];
        
        if (data.extraAxes)
        for(let i=0;i<data.extraAxes[0].length;i++) {
            let vec = data.extraAxes.map(row => row[i]);
            let scale = Math.sqrt(vec_dot(vec,vec));
            let unit = vec_scale(vec, 1/scale);
            this.axes.push({ 
                name: data.extraAxesNames[i],
                unit:unit,
                scale: scale,
                center: data.extraAxesCenter[i],
                color: axisColors[i+this.m],
            });
        }

        for(let i=0;i<this.m;i++) {
            let unit = zeros(this.m);
            unit[i] = 1;
            this.axes.push({
                name: data.colnames[i],
                center: this.center[i],
                scale: this.scale[i],
                unit: unit,
                color: axisColors[i],
            });
        }
        
        // Precompute projection of all data onto all axes
        for(let i=0;i<this.axes.length;i++) {
            this.axes[i].proj = this.X.map(vec => vec_dot(vec, this.axes[i].unit));
        }
                
        this.levels = data.levels;
        this.group = this.permutor.map(i => data.group[i]);
        
        let n_groups = this.levels.length;
        this.fills = [ ];
        this.fillsFaded = [ ];
        for(let i=0;i<this.n;i++) {
            let angle = (this.group[i]+1/3)/n_groups;
            let value = 80+48*i/this.n;
            let r = hex_byte( value*(1+Math.cos(angle*Math.PI*2)) );
            let g = hex_byte( value*(1+Math.cos((angle+1/3)*Math.PI*2)) );
            let b = hex_byte( value*(1+Math.cos((angle+2/3)*Math.PI*2)) );
            this.fills[i] = '#'+r+g+b;;
            this.fillsFaded[i] = '#'+r+g+b+'1f';
        }
        
        this.levelColors = [ ];
        for(let i=0;i<n_groups;i++) {
            let angle = (i+1/3)/n_groups;
            let value = 104;
            let r = hex_byte( value*(1+Math.cos(angle*Math.PI*2)) );
            let g = hex_byte( value*(1+Math.cos((angle+1/3)*Math.PI*2)) );
            let b = hex_byte( value*(1+Math.cos((angle+2/3)*Math.PI*2)) );
            this.levelColors[i] = '#'+r+g+b;
        }

        
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
                color: this.levelColors[i],
                active: true,
                x:2, y:0, //Outside plot area will be reposition in configure()
            });
        }

        for(let i=0;i<this.axes.length;i++) {
            this.labelData.push({ 
                type: 'axis',
                axis: i,
                label: this.axes[i].name, 
                vec: this.axes[i].unit,
                color: '#000',
                active: true,
                x:2, y:0, //Outside plot area will be reposition in configure()
            });
        }
        
        //this.labelData.reverse();
        
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
        this.overlay.style.width = this.width+'px';

        // Scrollbars will appear if very small
        let controlHeight = this.get('controlDiv').offsetHeight + 5;
        this.size = Math.max(100, Math.min(this.width-100, this.height-controlHeight));

        this.canvas.height = this.size;
        this.overlay.style.height = this.size+'px';
        
        this.xScale = d3.scaleLinear()
            .domain([-1,1]).range([2.5,this.size-2.5]);
        this.yScale = d3.scaleLinear()
            .domain([-1,1]).range([this.size-2.5,2.5]);

        this.xScaleClamped = this.xScale.copy().clamp(true);
        this.yScaleClamped = this.yScale.copy().clamp(true);

        /* Draggable labels */
        
        let overlay = d3.select(this.overlay);
        
        overlay.selectAll('*').remove();
        
        this.mouseInCheckbox = false;
        
        let divs = overlay
            .selectAll('div')
            .data(this.labelData)
            .join(
                enter => {
                    let div = enter.append('div')
                        .classed('labelDiv', true);
                    div.append('input')
                        .attr('type','checkbox')
                        .property('checked',d => d.active)
                        .on('change',function(e,d) { d.active = this.checked; })
                        .on('mouseover',() => { this.mouseInCheckbox = true; })
                        .on('mouseout',() => { this.mouseInCheckbox = false; });
                    div.append('span');
                    return div;
                }
            );
        
        let labels = divs.select('span')
            .text(d=>d.label)
            .style('color',d=>d.color);
        //    .on('mouseover', (e,d)=>{ d.selected += 1; refresh_labels(); })
        //    .on('mouseout', (e,d)=>{ d.selected -= 1; refresh_labels(); });
    
        //labels.each(function(d) { 
        //    d.width = this.getBBox().width + 10; 
        //});
        
        divs
            //.attr('width', d=>d.width)
            //.attr('height', 20)
            //.attr('rx', 5)
            .style('cursor','grab')
            .on('mouseover', (e,d)=>{ d.selected += 1; refresh_labels(); })
            .on('mouseout', (e,d)=>{ d.selected -= 1; refresh_labels(); });
        
        divs.each(function (d) {
            d.halfWidth = this.offsetWidth/2;
            d.halfHeight = this.offsetHeight/2;
        });

        let thys = this; //sigh

        function refresh_labels() {
            let maxX = thys.xScale.invert(thys.width);
            for(let item of thys.labelData) {
                item.x = Math.max(-1,Math.min(maxX, item.x));
                item.y = Math.max(-1,Math.min(1,    item.y));
            }
            
            divs
                .style('left',d=>thys.xScale(d.x)-d.halfWidth+'px')
                .style('top',d=>thys.yScale(d.y)-d.halfHeight+'px')
                .style('background',d=>d.selected?'#aaa':'#ddd');
        }

        let drag = d3.drag()
            .subject(function (e,d) {
                return { x:e.x, y:e.y };
            })
            .on('start', function(e,d) {
                // Do not drag checkbox.
                if (thys.mouseInCheckbox)
                    return;
                
                thys.dragging = true;
                this.style.cursor = 'grabbing';
                d.selected += 1;
            })
            .on('drag', function(e,d) {
                // We decided not to drag because we started on the checkbox.
                if (!thys.dragging)
                    return;
                    
                d.x = thys.xScale.invert(e.x);
                d.y = thys.yScale.invert(e.y);
                refresh_labels();
            })
            .on('end', function(e,d) {
                if (!thys.dragging)
                    return;
                
                thys.dragging = false;
                this.style.cursor = 'grab';
                d.selected -= 1;
            });
        drag(divs);

        
        /* Reposition labels that are not currently in use. */
        let cols=Math.ceil((25*this.labelData.length)/(this.size-40));
        for(let i=0;i<this.labelData.length;i++) {
            let d = this.labelData[i];
            if (d.x < 1) continue;
            
            let col = i % cols, row = (i-col)/cols;
            d.index = i;
            d.selected = false;
            d.x = this.xScale.invert( this.size+10+d.halfWidth+(i%cols)*(this.width-this.size-10)/cols );
            d.y = this.yScale.invert( 20+row*25 );
        }
        
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
        
        this.get('messageArea').innerText = `${this.computeMessage}\n${Math.min(...this.fps)} to ${Math.max(...this.fps)} FPS`;

        let selected = this.labelData.filter(d=>d.selected)[0];
        let selectedAxis = null;
        if (selected != null && selected.type == 'axis')
            selectedAxis = selected.axis;
        
        let showAxes = this.get('axesCheckbox').checked;        
        
        let levelActive = Array(this.levels.length).fill(true);
        for(let item of this.labelData)
        if (item.type == 'level')
            levelActive[item.level] = item.active;
                
        this.overlay.style.opacity = this.mousing?1:0;

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
        for(let i=0;i<this.axes.length;i++) {
            let xProj = vec_dot(this.proj[0], this.axes[i].unit);
            let yProj = vec_dot(this.proj[1], this.axes[i].unit);
        
            ctx.beginPath();
            ctx.moveTo(this.xScale(-axisScale*xProj), this.yScale(-axisScale*yProj));
            ctx.lineTo(this.xScale(axisScale*xProj), this.yScale(axisScale*yProj));
            ctx.stroke();
        }

        // Points
        let xy = mat_tcrossprod(this.proj, this.X);

        let fills = [ ];
        for(let i=0;i<this.n;i++)
        if (levelActive[this.group[i]])
            fills[i] = this.fills[i];
        else
            fills[i] = this.fillsFaded[i];
        
        if (selected && selected.type == 'level' && levelActive[selected.level]) {
            for(let i=0;i<this.n;i++) {
                if (this.group[i] != selected.level)
                if (levelActive[this.group[i]])
                    fills[i] = '#bbbbbbff';
                else
                    fills[i] = '#bbbbbb1f';
            }
        }
        
        if (selected && selected.type == 'axis') {
            for(let i=0;i<this.n;i++) {
                let c = this.axes[selectedAxis].proj[i];
                c = Math.tanh(c * 2);                                                                    // Hmm
                fills[i] = d3.interpolateViridis(c*0.5+0.5) + (levelActive[this.group[i]]?"":"1f");
            }
        }
        
        let size = this.pointSize;
        for(let i=0;i<this.n;i++) {
            ctx.fillStyle = fills[i];
            ctx.fillRect(this.xScaleClamped(xy[0][i])-size, this.yScaleClamped(xy[1][i])-size, size*2, size*2);
        }
        
        // Rug
        if (showAxes && selectedAxis != null) {
            //ctx.strokeStyle = '#00000022';
            let xProj = vec_dot(this.proj[0], this.axes[selectedAxis].unit);
            let yProj = vec_dot(this.proj[1], this.axes[selectedAxis].unit);

            let ox = [ 
                 vec_dot(this.proj[1], this.axes[selectedAxis].unit), 
                -vec_dot(this.proj[0], this.axes[selectedAxis].unit) 
            ];
            ox = vec_scale(ox, 0.05/Math.sqrt(vec_dot(ox,ox)));
            for(let i=0;i<this.n;i++) {
                if (!levelActive[this.group[i]]) continue;
                
                let valueProj = this.axes[selectedAxis].proj[i];
                let p = [ 
                    xProj * valueProj, 
                    yProj * valueProj 
                ];                
                let pA = vec_add(p, ox);
                let pB = vec_add(p, vec_scale(ox,-1));
                
                ctx.strokeStyle = fills[i];
                ctx.beginPath();
                ctx.moveTo(this.xScaleClamped(pA[0]),this.yScaleClamped(pA[1]));
                ctx.lineTo(this.xScaleClamped(pB[0]),this.yScaleClamped(pB[1]));
                ctx.stroke();
            }
        }
                
        //Text section
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save()
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
        
        // Row label
        if (this.mousing && this.mouseX < this.size && this.rownames) {
            let dists = [ ];
            for(let i=0;i<this.n;i++)
                dists[i] = { i:i, d2:(this.xScaleClamped(xy[0][i])-this.mouseX)**2+(this.yScaleClamped(xy[1][i])-this.mouseY)**2 };
            dists.sort((a,b) => a.d2-b.d2);
            
            ctx.font = `15px sans-serif`;
            ctx.strokeStyle = `#fff`;
            ctx.fillStyle = `#000`;
            for(let i=Math.min(this.n,1)-1;i>=0;i--) {
                let j=dists[i].i;
                let x = this.xScaleClamped(xy[0][j]), y = this.yScaleClamped(xy[1][j]);
                ctx.strokeText(this.rownames[j], x, y);                
                ctx.fillText(this.rownames[j], x, y);                
            }
        }
                
        // Axis labels
        if (showAxes)
        for(let i=0;i<this.axes.length;i++) {
            let xProj = vec_dot(this.proj[0], this.axes[i].unit);
            let yProj = vec_dot(this.proj[1], this.axes[i].unit);
            
            if (this.axes[i].color) {
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = this.axes[i].color;
            } else {
                let r2 = xProj*xProj+yProj*yProj;
                let alpha = (i==selectedAxis ? '' : hex_byte(r2*2*355));
                ctx.strokeStyle = '#ffffff'+alpha;
                ctx.fillStyle = '#000000'+alpha;
            }
            
            if (i==selectedAxis) {
                let ticks = d3.scaleLinear()
                    .domain([this.axes[i].center-this.axes[i].scale*axisScale, this.axes[i].center+this.axes[i].scale*axisScale])
                    .range([-axisScale,axisScale])
                    .ticks(5);
                ctx.font = `12px sans-serif`;
                for(let value of ticks) {
                    let scaled = (value-this.axes[i].center)/this.axes[i].scale;
                    ctx.strokeText(`${value}`, this.xScale(scaled*xProj), this.yScale(scaled*yProj));    
                    ctx.fillText(`${value}`, this.xScale(scaled*xProj), this.yScale(scaled*yProj));    
                }
            }
            
            /*if (selectedAxis != null) {
                let similarity = vec_dot(this.axes[i].unit, this.axes[selectedAxis].unit)*0.5+0.5;
                ctx.fillStyle = d3.interpolateViridis(similarity);
                ctx.strokeStyle = '#fff';
            }*/
            
            ctx.font = `15px sans-serif`;
            ctx.strokeText(this.axes[i].name, this.xScale(axisScale*xProj), this.yScale(axisScale*yProj));
            ctx.fillText(this.axes[i].name, this.xScale(axisScale*xProj), this.yScale(axisScale*yProj));
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

        let levelActive = Array(this.levels.length).fill(true);
        for(let item of this.labelData)
        if (item.type == 'level')
            levelActive[item.level] = item.active;

        // Cut down oscillation during dragging
        if (this.dragging && doAttraction) {
            damping = Math.max(damping, attraction*5.0);
        }
        
        let elapsed = Math.max(1e-6, Math.min(1, real_elapsed));
        
        this.computeMessage = '';
        
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
            let activeX = this.X.filter((item,i) => levelActive[this.group[i]]);
            if (activeX.length) {
                let options = repulsionTable[whatRepulsion];
                let grad = gradRepulsion(proj, activeX, options.power, options.fine_scale);
                mat_scale_into(grad, -1*options.amount*repulsion);
                mat_add_into(vel, grad);
            }
        }

        if (doAttraction)        
        for(let label of this.labelData) {
            let x = label.x;
            let y = label.y;
            if (x <= -1 || y <= -1 || x >= 1 || y >= 1) continue;
            let adjustment = 4*(x*x+y*y);
            vel[0] = vec_add(vel[0], vec_scale(label.vec, x*adjustment*attraction));
            vel[1] = vec_add(vel[1], vec_scale(label.vec, y*adjustment*attraction));
        }
        
        
        let new_proj = mat_add(proj, mat_scale(vel, elapsed));
        
        // Nuke inactive axes
        let inactive = [ ];
        for(let item of this.labelData)
        if (item.type == 'axis' && !item.active)
            inactive.push(this.axes[item.axis].unit);
        
        let too_many = inactive.length >= this.m-1;
        let any_dropped = false;
        
        if (inactive.length && !too_many) {                                         //TODO: complain if too many
            let { u, v, q } = SVDJS.SVD(mat_transpose(inactive));
            let maxQ = Math.max(...q);
            u = mat_transpose(u);
            for(let i=0;i<u.length;i++) {
                // Don't nuke tiny directions (could arise from reduntant nukings).
                if (q[i] < maxQ*1e-6) {
                    any_dropped = true;
                    continue;                                                                        //TODO: make option
                }
                let vec = u[i];
                for(let j=0;j<2;j++)
                    new_proj[j] = vec_sub(new_proj[j], vec_scale(vec, vec_dot(vec,new_proj[j])));
            }
        }
        
        
        if (too_many) this.computeMessage += 'Error: too many axes removed';
        if (any_dropped) this.computeMessage += 'Note: reduntant axes removed';

        // Project onto Stiefel manifold                
        let { u, v, q } = SVDJS.SVD(mat_transpose(new_proj));
        new_proj = mat_tcrossprod(v, u);
        
        // "Position based dynamics"
        this.vel = mat_scale(mat_add(new_proj,mat_scale(proj,-1)), 1/elapsed);
        this.proj = new_proj;
    }
}

return { Langevitour };
})();

