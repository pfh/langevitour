
// @ts-ignore
import { normal } from 'jstat';

import { SVD } from 'svd-js';

// @ts-ignore
import { rgb, scaleLinear, ScaleLinear, select, drag, interpolateViridis } from 'd3';

import { 
    vecAdd, vecSub, vecScale, vecDot, times, zeros, zeroMat, randInt, 
    matAddInto, matScaleInto, matTcrossprodInto, matTranspose, matAdd, 
    matScale, removeSpin, permutation 
} from './math';

import { has, elementVisible, hexByte } from './util';

import { gradTable } from './guides';



let template = `~
<div>~
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
    </style>~

    <div style="position: relative" class=plotDiv>
        <canvas class=canvas></canvas>
        <div class=messageArea></div>
        <div class=overlay style="position: absolute; left:0; top:0;"></div>
        <div class=infoBox>
            <div><b><a href="https://logarithmic.net/langevitour/">langevitour</a></b></div>
            <div class=infoBoxInfo></div>
            <div>Projection:</div>
            <textarea class=infoBoxProj rows=5 cols=30 wrap=off onclick="this.select()"></textarea>
            <div><br>State:</div>
            <textarea class=infoBoxState rows=5 cols=30 wrap=on onfocus="this.setSelectionRange(0,this.value.length,'backward');" spellcheck=false></textarea>
        </div>
    </div>~

    <div class=controlDiv>
        <button class=fullscreenButton title="Full screen"
            ><svg  width=20 height=20 version="1.1" viewBox="7 7 22 22" style="vertical-align: middle;">
            <path d="M 10,16 l 2,0 l 0,-4 l 4,0 l 0,-2 L 10,10 l 0,6 l 0,0 z"></path>
            <path d="M 20,10 l 0,2 l 4,0 l 0,4 l 2,0 L 26,10 l -6,0 l 0,0 z"></path>
            <path d="M 24,24 l -4,0 l 0,2 L 26,26 l 0,-6 l -2,0 l 0,4 l 0,0 z"></path>
            <path d="M 12,20 L 10,20 L 10,26 l 6,0 l 0,-2 l -4,0 l 0,-4 l 0,0 z"></path>
            </svg>~
        </button>~
        
        <button class=infoButton>
            ?
        </button>~
        
        <div class=box>~
            Axes~
            <input class=axesCheckbox type=checkbox checked>~
        </div>~
        
        <div class=box>~
            Damping
            <input type=range min=-3 max=3 step=0.01 value=0 class=dampInput>~
        </div>~
        
        <div class=box>~
            Heat~
            <input class=heatCheckbox type=checkbox checked>~
            <input type=range min=-2 max=4 step=0.01 value=0 class=heatInput>~
        </div>~
        
        <br/>~
        
        <div class=box>~
            Guide
            <select class=guideSelect value=none>
                <optgroup label="Explore">
                    <option value=none title="Look at completely random projections.">free</option>
                </optgroup>
                <optgroup label="Layout">
                    <option value=ultralocal title="Try to ensure small things don't overlap. May be unstable.">ultralocal</option>
                    <option value=local title="Try to ensure things don't overlap. A good default.">local</option>
                    <option value=pca title="Equivalent to Principal Components Analysis.">PCA</option>
                    <option value=outlier title="Find projections with some points very far from other points.">outlier</option>
                </optgroup>
                <optgroup label="Central force">
                    <option value=push title="Push points away from the center.">push</option>
                    <option value=pull title="Pull points towards the center.">pull</option>
                </optgroup>
            </select> 
            <input type=range min=-2 max=2 step=0.01 value=0 class=guideInput>~
        </div>~
        
        <div class=box>~
            Label attraction~
            <input class=labelCheckbox type=checkbox checked>~
            <input type=range min=-3 max=1 step=0.01 value=0 class=labelInput>~
        </div>~
    </div>~
</div>~
`.replace(/~\s*/g,''); // Strip whitespace marked with initial '~'.


/** Class to create and animate a Langevin Tour widget */
export class Langevitour {
    container: HTMLElement;
    shadow: ShadowRoot;
    shadowChild: HTMLElement;
    canvas: HTMLCanvasElement;
    overlay: HTMLElement;
    
    width = 1;
    height = 1;
    originalWidth = 1;
    originalHeight = 1;
    size = 1;
    
    pointSize = 1;
    
    center: number[] = [];
    scale: number[] = [];
    X: number[][] = [[],[]];
    n = 0;
    m = 0;
    colnames: string[] = [];
    permutor: number[] = [];
    unpermutor: number[] = [];
    rownames: string[] = [];
    group: number[] = [];
    levels: string[] = [];
    levelColors: string[] = [];
    lineFrom: number[] = [];
    lineTo: number[] = [];
    
    fills: string[] = [];
    
    //Selections and filters from outside, primarily to support "crosstalk"
    selection: boolean[] | null = null; 
    filter: boolean[] | null = null;
    
    axes: { 
        name: string, 
        unit: number[], 
        scale: number, 
        center: number, 
        color: string, 
        proj: number[] 
    }[] = [];

    labelData: { 
        type: 'level'|'axis', 
        index: number, 
        label: string, 
        vec: number[], 
        color: string, 
        active: boolean, 
        x: number, 
        y: number,
        halfWidth: number,
        halfHeight: number,
        selected: boolean 
    }[] = [];
    
    // State of the system!
    proj: number[][] = [[],[]];
    vel: number[][] = [[],[]];
    
    xScale = scaleLinear();
    yScale = scaleLinear();
    xScaleClamped = scaleLinear();
    yScaleClamped = scaleLinear();
    
    haveData = false;
    frameScheduled = false;
    lastTime = 0; // Last frame time, in seconds.
    mouseInCheckbox = false; // Track is mouse in checkbox. Do not drag if in checkbox.
    dragging = false; // Used to avoid dragging from checkbox. Also adjusts physics during drag.
    fps: number[] = []; // FPS for up to the last 100 frames
    
    computeMessage = ""; // Warnings such as hiding too many variables.
    
    mousing = false; // Should overlay be visible?
    mouseX = 0; // Used to display row names
    mouseY = 0; // Used to display row names
    
    // Only used during doFrame. 
    // Properties only to avoid re-allocation.
    xy: number[][] = [[],[]];
    fillsFrame: string[] = [];
    pointActive: boolean[] = [];
        
    /** 
     * Create a Langevin Tour widget.
     * @param container Element to insert widget into.
     * @param width Desired initial width of widget.
     * @param height Desired initial height of widget.
     */
    constructor(container: HTMLElement, width: number, height: number) {
        // Set up elements in a shadow DOM to isolate from document style.
        // The extra div seems necessary to avoid weird shrinkage with resizing.
        this.container = container;
        let div = document.createElement("div");
        this.container.appendChild(div);
        this.shadow = div.attachShadow({mode: 'open'});
        this.shadow.innerHTML = template;
        this.shadowChild = this.shadow.firstChild as HTMLElement;
        
        this.canvas = this.get('canvas') as HTMLCanvasElement;
        this.overlay = this.get('overlay');
        
        // Allow this to be found using document.getElementById(name).langevitour
        // @ts-ignore
        this.container.langevitour = this;
        
        this.resize(width, height);
        
        // Track mouse:
        // svg overlay only appears when mouse in plot area
        // row name labels use mouse position
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
        
        // Hide fullscreen button if not available
        if (this.container.requestFullscreen == null)
            this.get('fullscreenButton').style.display = 'none';
        
        // Handle fullscreen
        this.get('fullscreenButton').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.shadowChild.requestFullscreen();
            } else if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        });
        
        this.shadowChild.addEventListener('fullscreenchange', () => { 
            let el = this.shadowChild;
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
        
        // Info box
        this.get('infoButton').addEventListener('click', () => {
            let el = this.get('infoBox');
            if (el.style.visibility == 'visible' || !this.haveData) {
                el.style.visibility = 'hidden';
            } else {
                el.style.visibility = 'visible';
                
                let matStr = 'projection <- cbind(\n    c(';
                matStr += this.proj.map(line => line.map(
                        (item,i) => (item/this.scale[i]).toFixed( Math.ceil(Math.log10(Math.max(0,this.scale[i]))+4) )
                    ).join(',')).join('),\n    c(');
                matStr += '))\nprojected <- as.matrix(X) %*% projection';
                
                this.getInput('infoBoxProj').value = matStr;
                this.getInput('infoBoxState').value = JSON.stringify(this.getState(), null, 4);
                this.get('infoBoxInfo').innerHTML = `<p>${this.X.length.toLocaleString("en-US")} points.</p>`;
            }        
        });
    }
    
    get(className: string) {
        return this.shadowChild.getElementsByClassName(className)[0] as HTMLElement;
    }

    getInput(className: string) {
        return this.get(className) as HTMLInputElement;
    }
    
    getString(className: string) {
        return this.getInput(className).value;
    }

    getNumber(className: string) {
        return Number( this.getInput(className).value );
    }
    
    getChecked(className: string) {
        return this.getInput(className).checked;
    }
    
    
    /**
     * Show data in the widget. Use "null" to clear the widget.
     *
     * data.X A row-major matrix, where each row represents a point and each column represents a variable. The data should be centered and scaled.
     *
     * data.colnames A name for each column in X.
     *
     * data.group Group number for each point. Integer values starting from 0.
     *
     * data.levels Group names for each group in data.group.
     *
     * [data.scale] Scaling to restore original units of X.
     *
     * [data.center] Center to restore original units of X.
     *
     * [data.rownames] A name for each point.
     *
     * [data.extraAxes] A matrix with each column defining a projection of interest.
     *
     * [data.extraAxesCenter] Center to restore original units of extra axes. Scaling is assumed already included in data.extraAxes.
     *
     * [data.extraAxesNames] A name for each extra axis.
     *
     * [data.lineFrom] Rows of X to draw lines from.
     *
     * [data.lineTo] Rows of X to draw lines to.
     *
     * [data.axisColors] CSS colors for each variable and then optionally for each extra axis.
     *
     * [data.levelColors] CSS colors for each level.
     *
     * [data.colorVariation] Amount of brightness variation of points, between 0 and 1.
     *
     * [data.pointSize] Radius of points in pixels.
     *
     * [data.state] State to be passed on to setState().
     */
    renderValue(data: null | {
            X: number[][],
            scale?: number[],
            center?: number[],
            colnames: string[],
            rownames?: string[],
            group: number[],
            levels: string[],
            extraAxes?: number[][],
            extraAxesCenter?: number[],
            extraAxesNames?: string[],
            lineFrom?: number[],
            lineTo?: number[],
            axisColors?: string[],
            levelColors?: string[],
            colorVariation?: number,
            pointSize?: number,
            state?: any
        }) {
        
        if (!data) {
            this.haveData = false;
            this.configure();
            return;
        }
        
        this.haveData = true;
        
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
        this.unpermutor = Array(this.n);
        for(let i=0;i<this.n;i++) 
            this.unpermutor[this.permutor[i]] = i;
        
        this.X = this.permutor.map(i => data.X[i]);
        
        if (!data.rownames || data.rownames.length == 0) 
            this.rownames = [ ];
        else {
            let rownames = data.rownames;
            this.rownames = this.permutor.map(i => rownames[i]);
        }
        
        this.colnames = data.colnames;
        
        this.lineFrom = (data.lineFrom || []).map(i => this.unpermutor[i]);
        this.lineTo = (data.lineTo || []).map(i => this.unpermutor[i]);
        
        this.axes = [ ];
        
        if (data.extraAxes && data.extraAxesNames && data.extraAxesCenter)
        for(let i=0;i<data.extraAxes[0].length;i++) {
            let vec = data.extraAxes.map(row => row[i]);
            let scale = Math.sqrt(vecDot(vec,vec));
            let unit = vecScale(vec, 1/scale);
            this.axes.push({ 
                name: data.extraAxesNames[i],
                unit:unit,
                scale: scale,
                center: data.extraAxesCenter[i],
                color: axisColors[i+this.m],
                proj: [] //Filled in below.
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
                proj: [] //Filled in below.
            });
        }
        
        // Precompute projection of all data onto all axes
        for(let i=0;i<this.axes.length;i++) {
            this.axes[i].proj = this.X.map(vec => vecDot(vec, this.axes[i].unit));
        }
                
        this.levels = data.levels;
        this.group = this.permutor.map(i => data.group[i]);
        
        let nGroups = this.levels.length;

        this.levelColors = (data.levelColors || []).slice();
        
        // Pick a palette if not given
        for(let i=this.levelColors.length;i<nGroups;i++) {
            let angle = (i+1/3)/nGroups;
            let value = 104;
            let r = value*(1+Math.cos(angle*Math.PI*2));
            let g = value*(1+Math.cos((angle+1/3)*Math.PI*2));
            let b = value*(1+Math.cos((angle+2/3)*Math.PI*2));
            this.levelColors[i] = rgb(r,g,b).formatHex();
        }
        
        // Point colors are given a small back-to-front brightness gradient,
        // to add some variation and give a pseudo-3D effect.
        let colorVariation = data.colorVariation == null ? 0.3 : data.colorVariation;
        this.fills = [ ];
        for(let i=0;i<this.n;i++) {
            let pointColor = rgb(this.levelColors[this.group[i]]);
            let value = 1+colorVariation*(i/this.n*2-1);
            pointColor.r *= value;
            pointColor.g *= value;
            pointColor.b *= value;
            this.fills[i] = pointColor.formatHex();
        }
        
        
        this.labelData = [ ];
        
        if (this.levels.length > 1)
        for(let i=0;i<this.levels.length;i++) {
            let vec = zeros(this.m);
            for(let j=0;j<this.n;j++)
                if (this.group[j] == i)
                    vec = vecAdd(vec, this.X[j]);
            vec = vecScale(vec, 1/Math.sqrt(vecDot(vec,vec)));            
            
            this.labelData.push({
                type: 'level',
                index: i,
                label: this.levels[i], 
                vec: vec,
                color: this.levelColors[i],
                active: true,
                x:2, y:0, //Outside plot area will be repositioned in configure()
                halfWidth:0, halfHeight:0, selected:false,
            });
        }
        
        for(let i=0;i<this.axes.length;i++) {
            this.labelData.push({ 
                type: 'axis',
                index: i,
                label: this.axes[i].name, 
                vec: this.axes[i].unit,
                color: this.axes[i].color || '#000000',
                active: true,
                x:2, y:0, //Outside plot area will be repositioned in configure()
                halfWidth:0, halfHeight:0, selected:false,
            });
        }
        
        // Set initial projection state        
        this.proj = zeroMat(2, this.m);
        this.proj[0][0] = 1;
        this.proj[1][1] = 1;
        this.vel = zeroMat(2, this.m);
        
        // Only used in doFrame. However this is a fairly large amount of memory that needs to be used each time.
        this.xy = zeroMat(2, this.n);
        this.fillsFrame = Array(this.n).fill("");
        this.pointActive = Array(this.n).fill(true);
        
        if (!this.frameScheduled) {
            this.scheduleFrame();
            this.frameScheduled = true;
        }
        
        this.configure();
        
        if (data.state)
            this.setState(data.state);
    }
    
    /** 
     * Resize the widget.
     *
     * Ignored if widget has gone full-screen.
     *
     * @param {number} width New width.
     * @param {number} height New height.
     */
    resize(width: number, height: number) {
        // At least in pkgdown vignettes, we get weird resize requests while fullscreen.
        if (document.fullscreenElement) return;
        
        this.width = Math.max(200, width);
        this.height = Math.max(200, height);
        
        this.configure();
    }
    
    configure() {
        this.canvas.style.width = this.width+'px';
        this.overlay.style.width = this.width+'px';
        
        // Scrollbars will appear if very small
        let controlHeight = this.get('controlDiv').offsetHeight + 5;
        this.size = Math.max(100, Math.min(this.width-100, this.height-controlHeight));
        
        this.canvas.style.height = this.size+'px';
        this.overlay.style.height = this.size+'px';
        
        // Clean up and return if no data.
        if (!this.haveData) {
            // Clear any old display
            this.overlay.style.opacity = "0";
            let ctx = this.canvas.getContext("2d")!;
            ctx.scale(1,1);
            ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
            return;
        }
        
        this.xScale = scaleLinear()
            .domain([-1,1]).range([2.5,this.size-2.5]);
        this.yScale = scaleLinear()
            .domain([-1,1]).range([this.size-2.5,2.5]);

        this.xScaleClamped = this.xScale.copy().clamp(true);
        this.yScaleClamped = this.yScale.copy().clamp(true);

        /* Draggable labels */
        
        let overlay = select(this.overlay);
        
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
        
        divs
            .style('cursor','grab')
            .on('mouseover', (e,d)=>{ d.selected += 1; refreshLabels(); })
            .on('mouseout', (e,d)=>{ d.selected -= 1; refreshLabels(); });
        
        divs
            .select('span')
            .text(d=>d.label)
            .style('color',d=>d.color);
                
        divs.each(function (d) {
            d.halfWidth = this.offsetWidth/2;
            d.halfHeight = this.offsetHeight/2;
        });

        let thys = this; //sigh

        function refreshLabels() {
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

        let makeDraggable = drag()
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
                refreshLabels();
            })
            .on('end', function(e,d) {
                if (!thys.dragging)
                    return;
                
                thys.dragging = false;
                this.style.cursor = 'grab';
                d.selected -= 1;
            });
        makeDraggable(divs);

        
        /* Reposition labels that are not currently in use. */
        let cols=Math.ceil((25*this.labelData.length)/(this.size-40));
        for(let i=0;i<this.labelData.length;i++) {
            let d = this.labelData[i];
            if (d.x < 1) continue;
            
            let col = i % cols, row = (i-col)/cols;
            d.selected = false;
            d.x = this.xScale.invert( this.size+10+d.halfWidth+(i%cols)*(this.width-this.size-10)/cols );
            d.y = this.yScale.invert( 20+row*25 );
        }
        
        refreshLabels();
    }
    
    /**
     * Get the current widget state.
     */
    getState() {
        let result = { } as any;
        
        result.axesOn = this.getChecked('axesCheckbox');
        result.heatOn = this.getChecked('heatCheckbox');
        result.guideType = this.getString('guideSelect');
        result.labelAttractionOn = this.getChecked('labelCheckbox');
        
        result.damping = this.getNumber('dampInput');
        result.heat = this.getNumber('heatInput');
        result.guide = this.getNumber('guideInput');
        result.labelAttraction = this.getNumber('labelInput');
        
        result.labelInactive = [ ];
        result.labelPos = { };
        for(let item of this.labelData) {
            if (!item.active)
               result.labelInactive.push(item.label);
            if (item.x < 1)
               result.labelPos[ item.label ] = [ item.x, item.y ];
        }
        
        result.projection = this.proj;
        
        // Potentially large.
        if (this.selection)
            result.selection = this.unpermutor.map(i => this.selection![i]);
        else
            result.selection = null;

        // Potentially large.
        if (this.filter)
            result.filter = this.unpermutor.map(i => this.filter![i]);
        else
            result.filter = null;
        
        return result;
    }
    
    /**
     * Set the widget state. 
     *
     * Can be used to restore a previous state of the widget obtained with getState().
     *
     * @param state A JSON string or an Object containing the desired state.
     */
    setState(state) {
        if (typeof state == "string")
            state = JSON.parse(state);
            
        if (!state)
            return;
    
        if (has(state,'axesOn'))
            this.getInput('axesCheckbox').checked = state.axesOn;
        if (has(state,'heatOn'))
            this.getInput('heatCheckbox').checked = state.heatOn;
        
        // Old    
        if (has(state,'pointRepulsionType'))
            this.getInput('guideSelect').value = state.pointRepulsionType;
        // New
        if (has(state,'guideType'))
            this.getInput('guideSelect').value = state.guideType;
        
        if (has(state,'labelAttractionOn'))
            this.getInput('labelCheckbox').checked = state.labelAttractionOn;
        
        if (has(state,'damping'))
            this.getInput('dampInput').value = state.damping;
        if (has(state,'heat'))
            this.getInput('heatInput').value = state.heat;
        
        // Old
        if (has(state,'pointRepulsion'))
            this.getInput('guideInput').value = state.pointRepulsion;
        // New
        if (has(state,'guide'))
            this.getInput('guideInput').value = state.guide;
        
        if (has(state,'labelAttraction'))
            this.getInput('labelInput').value = state.labelAttraction;

        if (has(state,'labelInactive'))
        for(let item of this.labelData)
            item.active = !state.labelInactive.includes(item.label);
        
        if (has(state,'labelPos'))
        for(let item of this.labelData)
        if (has(state.labelPos,item.label)) {
            item.x = state.labelPos[item.label][0];
            item.y = state.labelPos[item.label][1];
        } else {
            item.x = 1;
        }
        
        if (has(state,'projection'))
            this.proj = Array.from(state.projection.map(item => Array.from(item)));
        
        if (has(state,'selection')) {
            if (state.selection === null)
                this.selection = null;
            else
                this.selection = this.permutor.map(i => state.selection[i]);
        }
        
        if (has(state,'filter')) {
            if (state.filter === null)
                this.filter = null;
            else
                this.filter = this.permutor.map(i => state.filter[i]);
        }
        
        this.configure();
    }
    
    scheduleFrame() {
        window.requestAnimationFrame(this.doFrame.bind(this))
    }
    
    doFrame(time: number) {
        if (!this.haveData) {
            this.frameScheduled = false;
            return;
        }
        
        time /= 1000.0; //Convert to seconds
        
        let elapsed = time - this.lastTime;
        this.lastTime = time;
        
        if (this.X == null || !elementVisible(this.container)) {
            // We aren't visible. Wait a while.
            window.setTimeout(this.scheduleFrame.bind(this), 100);
            return;
        }
        
        this.compute(elapsed);
        
        this.fps.push( Math.round(1/elapsed) );
        if (this.fps.length > 100) this.fps.shift();
        
        this.get('messageArea').innerText = `${this.computeMessage}\n${Math.min(...this.fps)} to ${Math.max(...this.fps)} FPS`;

        let selectedAxis: number|null = null;
        let selectedLevel: number|null = null;
        let selected = this.labelData.filter(d=>d.selected);
        if (selected.length) {
            if (selected[0].type == 'axis')
                selectedAxis = selected[0].index;
            else
                selectedLevel = selected[0].index;
        }
        
        let showAxes = this.getChecked('axesCheckbox');
        
        let levelActive = Array(this.levels.length).fill(true);
        for(let item of this.labelData)
        if (item.type == 'level')
            levelActive[item.index] = item.active;
        
        // Note: pointActive is updated in compute.    
        
                
        this.overlay.style.opacity = this.mousing?"1":"0";
        
        // Setup canvas and get context
        // Adjust for HiDPI screens and zoom level
        // see https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
        let ratio = window.devicePixelRatio;
        this.canvas.width = Math.floor(this.width * ratio);
        this.canvas.height = Math.floor(this.size * ratio);
        let ctx = this.canvas.getContext("2d")!;
        ctx.scale(ratio, ratio);
        ctx.clearRect(0,0,this.width,this.size);
        
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
            let xProj = vecDot(this.proj[0], this.axes[i].unit);
            let yProj = vecDot(this.proj[1], this.axes[i].unit);
        
            ctx.beginPath();
            ctx.moveTo(this.xScale(-axisScale*xProj), this.yScale(-axisScale*yProj));
            ctx.lineTo(this.xScale(axisScale*xProj), this.yScale(axisScale*yProj));
            ctx.stroke();
        }

        // Projection
        matTcrossprodInto(this.xy, this.proj, this.X);
        
        // Lines
        for(let i=0;i<this.lineFrom.length;i++) {
            let a = this.lineFrom[i],
                b = this.lineTo[i];
            
            if (!this.pointActive[a] || !this.pointActive[b])
                continue;
            
            // Make short lines darker so they have equal visual weight to longer lines
            // Clipped for d < 1/4, d > 1
            let d = Math.sqrt( (this.xy[0][a]-this.xy[0][b])**2 + (this.xy[1][a]-this.xy[1][b])**2 );
            d = Math.max(1/4,Math.min(1,d));
            ctx.strokeStyle = '#000000'+hexByte(128/(4*d));
            
            ctx.beginPath();
            ctx.moveTo(this.xScaleClamped(this.xy[0][a]), this.yScaleClamped(this.xy[1][a]));
            ctx.lineTo(this.xScaleClamped(this.xy[0][b]), this.yScaleClamped(this.xy[1][b]));
            ctx.stroke();
        }

        // Points
        
        // Default to group colors
        for(let i=0;i<this.n;i++)
            this.fillsFrame[i] = this.fills[i];
        
        // If a crosstalk selection is active, gray the inactive points
        if (this.selection) {
            for(let i=0;i<this.n;i++) {
                if (!this.selection[i])
                    this.fillsFrame[i] = '#bbbbbb';
            }
        }
        
        // If we're mousing over a level, gray the other levels
        if (selectedLevel !== null && levelActive[selectedLevel]) {
            for(let i=0;i<this.n;i++) {
                if (this.group[i] != selected[0].index)
                    this.fillsFrame[i] = '#bbbbbb';
            }
        }
        
        // If we're mousing over an axis, color by position on axis
        if (selectedAxis !== null) {
            for(let i=0;i<this.n;i++) {
                let c = this.axes[selectedAxis].proj[i];
                c = Math.tanh(c * 2);   // Extreme values compressed so -1<c<1
                this.fillsFrame[i] = interpolateViridis(c*0.5+0.5);
            }
        }
        
        // Draw points that aren't hidden
        let size = this.pointSize;
        for(let i=0;i<this.n;i++) {
            if (this.pointActive[i]) {
                ctx.fillStyle = this.fillsFrame[i];
                ctx.fillRect(this.xScaleClamped(this.xy[0][i])-size, this.yScaleClamped(this.xy[1][i])-size, size*2, size*2);
            }
        }
        
        // If we're mousing over an axis, draw a rug for the axis
        if (showAxes && selectedAxis !== null) {
            //ctx.strokeStyle = '#00000022';
            let xProj = vecDot(this.proj[0], this.axes[selectedAxis].unit);
            let yProj = vecDot(this.proj[1], this.axes[selectedAxis].unit);

            let ox = [ 
                 vecDot(this.proj[1], this.axes[selectedAxis].unit), 
                -vecDot(this.proj[0], this.axes[selectedAxis].unit) 
            ];
            ox = vecScale(ox, 0.05/Math.max(1e-30,Math.sqrt(vecDot(ox,ox)))); //Avoid very occasional divide by zero
                        
            // Hack to speed up rug drawing by rounding positions, 
            // then only drawing each position once.
            /** @type {Map<number,string>} */
            let rug = new Map();
            let rounding = this.size;
            for(let i=0;i<this.n;i++) {
                if (!this.pointActive[i]) continue;
                let proj = this.axes[selectedAxis].proj[i];
                rug.set(Math.round(proj*rounding)/rounding, this.fillsFrame[i]);
            }
            
            for(let [proj, fill] of rug) {
                let p = [ xProj*proj, yProj*proj ];                
                let pA = vecAdd(p, ox);
                let pB = vecAdd(p, vecScale(ox,-1));
                
                ctx.strokeStyle = fill;
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
        if (this.mousing && this.mouseX < this.size && this.rownames.length) {
            let dists: {i:number,d2:number}[] = [ ];
            for(let i=0;i<this.n;i++)
                dists[i] = { 
                    i:i, 
                    d2:(this.xScaleClamped(this.xy[0][i])-this.mouseX)**2+
                       (this.yScaleClamped(this.xy[1][i])-this.mouseY)**2 };
            dists.sort((a,b) => a.d2-b.d2);
            
            ctx.font = `15px sans-serif`;
            ctx.strokeStyle = `#fff`;
            ctx.fillStyle = `#000`;
            for(let i=Math.min(this.n,1)-1;i>=0;i--) {
                let j=dists[i].i;
                let x = this.xScaleClamped(this.xy[0][j]), y = this.yScaleClamped(this.xy[1][j]);
                ctx.strokeText(this.rownames[j], x, y);                
                ctx.fillText(this.rownames[j], x, y);                
            }
        }
                
        // Axis labels
        if (showAxes)
        for(let i=0;i<this.axes.length;i++) {
            let xProj = vecDot(this.proj[0], this.axes[i].unit);
            let yProj = vecDot(this.proj[1], this.axes[i].unit);
            
            if (this.axes[i].color) {
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = this.axes[i].color;
            } else {
                let r2 = xProj*xProj+yProj*yProj;
                let alpha = (i==selectedAxis ? '' : hexByte(r2*2*355));
                ctx.strokeStyle = '#ffffff'+alpha;
                ctx.fillStyle = '#000000'+alpha;
            }
            
            if (i === selectedAxis) {
                let ticks = scaleLinear()
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
                let similarity = vecDot(this.axes[i].unit, this.axes[selectedAxis].unit)*0.5+0.5;
                ctx.fillStyle = interpolateViridis(similarity);
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
        for(let i=0,j=0;i<this.levels.length;i++)
        if (levelActive[i]) {
            ctx.fillStyle = this.levelColors[i];
            ctx.fillText(this.levels[i], this.size+10, 11+j*20);
            j++;
        }
        
        window.setTimeout(this.scheduleFrame.bind(this), 5);
    }
    
    compute(realElapsed: number) {
        let damping =     0.1  *Math.pow(10, this.getNumber('dampInput'));
        let heat =        0.1  *Math.pow(10, this.getNumber('heatInput'));
        let guide =       1.0  *Math.pow(10, this.getNumber('guideInput'));
        let attraction =  1.0  *Math.pow(10, this.getNumber('labelInput'));
        let doHeat = this.getChecked('heatCheckbox');
        let whatGuide = this.getString('guideSelect');
        let doAttraction = this.getChecked('labelCheckbox');

        let levelActive = Array(this.levels.length).fill(true);
        for(let item of this.labelData)
        if (item.type == 'level')
            levelActive[item.index] = item.active;
        
        for(let i=0;i<this.n;i++)
            this.pointActive[i] = levelActive[this.group[i]];
        
        if (this.filter !== null) {
            for(let i=0;i<this.n;i++)
                this.pointActive[i] = this.pointActive[i] && this.filter[i];
        }
        
        
        // Cut down oscillation during dragging
        if (this.dragging && doAttraction) {
            damping = Math.max(damping, attraction*5.0);
        }
        
        let elapsed = Math.max(1e-6, Math.min(1, realElapsed));
        
        this.computeMessage = '';
        
        let vel = this.vel;
        let proj = this.proj;
        
        //Integrate dv/dt = -damping * v
        let velKeep = Math.exp(-elapsed*damping);
        matScaleInto(vel, velKeep);

        if (doHeat) {
            // Damping reduces the variance * velKeep^2
            // We need to add velReplaceVar * desired steady state variance of temperature
            
            // Note the sqrt(2) that appears in the continuous form of the Langevin equation arises from 
            // sqrt(1-velKeep*velKeep) approx= sqrt(2*elapsed*damping) for small elapsed*damping
            
            let velReplaceVar = 1 - velKeep*velKeep;        
            let noise = times(proj.length, times, this.m,
                normal.sample, 0, Math.sqrt(heat*velReplaceVar));
            
            noise = removeSpin(noise, proj);
            
            matAddInto(vel, noise);
        }

        if (whatGuide != 'none') {
            let activeX = this.X.filter((item,i) => this.pointActive[i]);
            if (activeX.length) {
                let grad = gradTable[whatGuide](proj, activeX);
                matScaleInto(grad, -guide);
                matAddInto(vel, grad);
            }
        }

        if (doAttraction)        
        for(let label of this.labelData) {
            let x = label.x;
            let y = label.y;
            if (x <= -1 || y <= -1 || x >= 1 || y >= 1) continue;
            if (label.type == 'level' && !levelActive[label.index]) continue;
            let adjustment = 4*(x*x+y*y);
            vel[0] = vecAdd(vel[0], vecScale(label.vec, x*adjustment*attraction));
            vel[1] = vecAdd(vel[1], vecScale(label.vec, y*adjustment*attraction));
        }
        
        
        // Nuke inactive axes
        // - remove from velocity
        // - gradually remove from position
        
        let inactive: number[][] = [ ];
        for(let item of this.labelData)
        if (item.type == 'axis' && !item.active)
            inactive.push(this.axes[item.index].unit);
        
        let tooMany = inactive.length >= this.m-1;
        let anyDropped = false;
        
        if (inactive.length && !tooMany) {
            // How fast inactive axes are removed
            let nuke_amount = Math.min(2, 1/elapsed);
        
            let { u, v, q } = SVD(matTranspose(inactive));
            let maxQ = Math.max(...q);
            u = matTranspose(u);
            for(let i=0;i<u.length;i++) {
                // Don't nuke tiny directions (could arise from reduntant nukings). TODO: make tolerance level an option
                if (q[i] < maxQ*1e-6) {
                    anyDropped = true;
                    continue;
                }
                let vec = u[i];
                for(let j=0;j<2;j++) {
                    vel[j] = vecSub(vel[j], 
                        vecScale(vec, vecDot(vec, vel[j]) + nuke_amount*vecDot(vec, proj[j])))
                }
            }
        }
                
        if (tooMany) this.computeMessage += 'Error: too many axes removed';
        if (anyDropped) this.computeMessage += 'Note: reduntant axes removed';


        // Velocity step        
        let newProj = matAdd(proj, matScale(vel, elapsed));

        // Project onto Stiefel manifold                
        let { u, v, q } = SVD(matTranspose(newProj));
        matTcrossprodInto(newProj, v, u);
        
        // "Position based dynamics"
        this.vel = matScale(matAdd(newProj,matScale(proj,-1)), 1/elapsed);
        this.proj = newProj;
    }
}

