
import jstat from 'jstat';
const { normal } = jstat;

import { SVD } from 'svd-js';

import { rgb, scaleLinear, select, drag, interpolateViridis } from 'd3';

import { 
    vecAdd, vecSub, vecScale, vecDot, times, zeros, zeroMat, randInt, 
    matAddInto, matScaleInto, matTcrossprodInto, matTranspose, matAdd, 
    matScale, removeSpin, permutation 
} from './math.js';

import { has, elementVisible, locateEventInElement, toggleVisible, hexByte } from './util.js';

import { gradTable } from './guides.js';



let template = `~
<div>~
    <style>
        /* Reset all host styling. */
        :host {
            all: initial;
        }
        
        * { 
            font-size: 16px;
            font-family: sans-serif; 
        }
        
        input { vertical-align: middle; }
        input[type=checkbox] { vertical-align: baseline; }
        input[type=range] { width: 150px; }
        
        .controlDiv {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .box { 
            background: #eee;
            padding: 4px 6px 4px 6px; 
            margin: 4px 4px 4px 4px;
            border-radius: 4px;
            vertical-align: middle;
        }
        
        .controlButton {
            padding: 0px;
            margin: 4px 4px 4px 4px;
            vertical-align: middle;
            height: 26px;
            width: 26px;
        }
        
        .infoBox {
            visibility: hidden;
            position: absolute;
            left: 10px;
            bottom: 0px;
            padding: 8px;
            background: #eee;
            border: 1px solid black;
            border-radius: 4px;
        }
        
        .messageArea {
            position: absolute;
            white-space: pre;
            text-align: right;
            right: 0px;
            bottom: 0px;
            color: #888;
            background: #ffffffff;
            padding: 3px;
            border-radius: 4px;
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
        
        table {
            border-spacing: 0px;
        }
        
        tr:hover td { background: #ddddff; }
        
        .canvas { 
            display: block; 
        }
    </style>~

    <div style="position: relative" class=plotDiv>~
        <canvas class=canvas></canvas>~
        <div class=messageArea></div>~
        <div class=overlay style="position: absolute; left:0; top:0;" oncontextmenu="return false;"></div>~
        <div class=infoBox>~
            <div><b><a href="https://logarithmic.net/langevitour/" target="_blank">langevitour</a></b></div>
            <br><div><button class=infoBoxProjButton>Projection &#9662;</button></div>
            <textarea class=infoBoxProj rows=5 cols=30 wrap=off spellcheck=false onclick="this.setSelectionRange(0,this.value.length,'backward');" style="display: none"></textarea>
            <br><div><button class=infoBoxStateButton>State &#9662;</button></div>
            <textarea class=infoBoxState rows=7 cols=30 wrap=off spellcheck=false onfocus="this.setSelectionRange(0,this.value.length,'backward');" style="display: none"></textarea>
            <div class=infoBoxInfo></div>
            <table>
              <tr><td>Brush size</td><td><input type=range min=-1 max=1 step=0.01 value=0 class=brushInput></td></tr>
              <tr><td>Zoom</td><td><input type=range min=-1 max=1 step=0.01 value=0 class=zoomInput></td></tr>
              <tr><td>Damping</td><td><input type=range min=-3 max=3 step=0.01 value=0 class=dampInput></td></tr>
              <tr><td>Heat</td><td><input type=range min=-2 max=4 step=0.01 value=0 class=heatInput></td></tr>
              <tr><td>Label strength</td><td><input type=range min=-3 max=1 step=0.01 value=0 class=labelInput></td></tr>
              <tr><td>Guide strength</td><td><input type=range min=-2 max=2 step=0.01 value=0 class=guideInput></td></tr>
            </table>
        </div>~
    </div>~

    <div class=controlDiv>~
        <button class="controlButton fullscreenButton" title="Full screen">~
            <svg  width=20 height=20 version="1.1" viewBox="0 0 20 20" style="vertical-align: middle;">
                <rect x=2 y=2 width=6 height=2 />
                <rect x=2 y=2 width=2 height=6 />
                <rect x=12 y=2 width=6 height=2 />
                <rect x=16 y=2 width=2 height=6 />
                <rect x=2 y=16 width=6 height=2 />
                <rect x=2 y=12 width=2 height=6 />
                <rect x=12 y=16 width=6 height=2 />
                <rect x=16 y=12 width=2 height=6 />
            </svg>~
        </button>~
        
        <button class="controlButton infoButton" title="Further controls and information">~
            <svg viewBox="0 0 20 20" width=20 height=20 style="vertical-align: middle;">
                <rect x="4" y="5" width="12" height="2"></rect>
                <rect x="4" y="9" width="12" height="2"></rect>
                <rect x="4" y="13" width="12" height="2"></rect>
            </svg>
        </button>~
        
        <button class="controlButton playButton" title="Play / Pause">~
        </button>
        
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
            </select>~ 
        </div>~
        
        <div class=box><label>~
            <input class=axesCheckbox type=checkbox checked>~
            axes~
        </label></div>~
        
        <div class=box><label>
            <input class=heatCheckbox type=checkbox checked>~
            heat~
        </label></div>~
        
        <div class=box><label>~
            <input class=labelCheckbox type=checkbox checked>~
            label attract~
        </label></div>~
    </div>~
</div>~
`.replace(/~\s+/g,''); // Strip whitespace marked with initial '~'.

let playSvg = 
`<svg viewBox="0 0 20 20" width=20 height=20 style="vertical-align: middle;">
    <path d="M 6 4 L 16 10 L 6 16 Z">
</svg>`;

let pauseSvg = 
`<svg viewBox="0 0 20 20" width=20 height=20 style="vertical-align: middle;">
    <rect x="4" y="4" width="4" height="12"></rect>
    <rect x="12" y="4" width="4" height="12"></rect>
</svg>`;



/** Class to create and animate a Langevin Tour widget 
  *
  * Emits a "changeFilter" event when a label checkbox is checked/unchecked.
  *
  * Emits a "changeSelection" event when brushing occurs.
  */
export class Langevitour extends EventTarget {
    container: HTMLElement;
    shadowDiv: HTMLElement;
    shadowRoot: ShadowRoot;
    shadowChild: HTMLElement;
    canvas: HTMLCanvasElement;
    overlay: HTMLElement;
    
    width = 1;
    height = 1;
    size = 1;
    
    // We stash the original size when we go full-screen
    fullscreen = false;
    originalWidth = 1;
    originalHeight = 1;
    
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
    lineColors: string[] = [];
    
    fills: string[] = [];
    
    //Filters from outside, primarily to support "crosstalk"
    filter: boolean[] | null = null;
    
    //Selection both from crosstalk and internal
    selection: boolean[] | null = null;
    selectionChanged = false; // Do we need to emit a changeSelection event -- delayed to mouse up
    
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
        selected: number //0 for not selected, >0 for selected
    }[] = [];
    
    // State of the system!
    proj: number[][] = [[],[]];
    vel: number[][] = [[],[]];
    
    zoom = 1;
    xScaleUnit = scaleLinear(); // Used for labels
    yScaleUnit = scaleLinear();
    xScale = scaleLinear(); // Used for points
    yScale = scaleLinear();
    xScaleClamped = scaleLinear();
    yScaleClamped = scaleLinear();
    
    haveData = false;
    playing = true;
    frameScheduled = false;
    lastTime = 0; // Last frame time, in seconds. Set to zero to cause no step on the next frame.
    mouseInCheckbox = false; // Track is mouse in checkbox. Do not drag if in checkbox.
    dragging = false; // Used to avoid dragging from checkbox. Also adjusts physics during drag.
    fps: number[] = []; // FPS for up to the last 100 frames
    
    computeMessage = ""; // Warnings such as hiding too many variables.
    
    mousing = false; // Should overlay be visible?
    mouseDown = false; // While this mouse is down, the selection continues to be updated.
    mouseWentDown = false; // Set when mouse button goes down. Unset once selection updated.
    mouseShiftKey = false; // Shift was pressed at mouse down, we want to extend the current selection.
    mouseX = 0;
    mouseY = 0;
    
    rightMouseDown = false; // Used to directly interact with projection.
    rightMouseWentDown = false;
    tugging = false;
    tugX = 0; // Desired position in projection space.
    tugY = 0;
    tugPoints: number[] = [ ]; // Indices of points being tugged.
    
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
        super();
        
        // Set up elements in a shadow DOM to isolate from document style.
        // The extra div seems necessary to avoid weird shrinkage with resizing.
        this.container = container;
        this.shadowDiv = document.createElement("div");
        this.container.appendChild(this.shadowDiv);
        this.shadowRoot = this.shadowDiv.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = template;
        this.shadowChild = this.shadowRoot.firstChild as HTMLElement;
        
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
            this.scheduleFrameIfNeeded();
        });
        plotDiv.addEventListener('mouseout', (e) => { 
            this.mousing = false;
            this.mouseDown = false;
            this.rightMouseDown = false;
            this.scheduleFrameIfNeeded();
        });
        plotDiv.addEventListener('mousemove', (e) => { 
            [ this.mouseX, this.mouseY ] = locateEventInElement(e, this.canvas);
            this.mouseDown = e.buttons == 1;
            this.rightMouseDown = e.buttons == 2;
            this.scheduleFrameIfNeeded();
        });
        plotDiv.addEventListener('mousedown', (e) => {
            if (!(e.target as HTMLElement).classList.contains("overlay"))
                return;
            
            let el = this.get('infoBox');
            if (el.style.visibility == 'visible') {
                el.style.visibility = 'hidden';
                return;
            }
            
            [ this.mouseX, this.mouseY ] = locateEventInElement(e, this.canvas);
            this.mouseDown = e.buttons == 1;
            this.rightMouseDown = e.buttons == 2;
            
            if (this.mouseDown) {
                this.mouseWentDown = true;
                this.mouseShiftKey = e.shiftKey;
            }
            
            if (this.rightMouseDown) {
                this.rightMouseWentDown = true;
            }
            
            this.scheduleFrameIfNeeded();
        });
        plotDiv.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
            this.rightMouseDown = false;
            this.scheduleFrameIfNeeded();
        });
        
        // Hide fullscreen button if not available
        if (this.container.requestFullscreen == null)
            this.get('fullscreenButton').style.display = 'none';
        
        // Handle fullscreen
        // Complication: Window may resize after getting fullscreenchange event, so we have to handle window resize.
        // - Window does not resize immediately in Chrome.
        // - Macs with webcam cutout do something weird on Firefox.
        
        this.get('fullscreenButton').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.shadowDiv.requestFullscreen();
            } else if (document.fullscreenElement === this.shadowDiv && document.exitFullscreen) {
                document.exitFullscreen();
            }
        });
        
        let handleWindowSize = () => {
            if (!this.fullscreen) 
                return;
            let el = this.shadowDiv;
            let width = window.innerWidth;
            let height = window.innerHeight;
            let pad = Math.max(0, width-height)/2;
            el.style.paddingLeft = pad+'px';
            this.width = width-pad;
            this.height = height;
            this.configure();
        }
        
        this.shadowDiv.addEventListener('fullscreenchange', () => { 
            let el = this.shadowDiv;
            if (document.fullscreenElement === el) {
                // Stash original size
                if (!this.fullscreen) {
                    this.fullscreen = true;
                    this.originalWidth = this.width;
                    this.originalHeight = this.height;
                    window.addEventListener('resize', handleWindowSize);
                }
                handleWindowSize();
                // ... further window resize events may occur while full screen ...
            } else if (this.fullscreen) {
                // Restore original size
                this.fullscreen = false;
                el.style.paddingLeft = '0px';
                this.width = this.originalWidth;
                this.height = this.originalHeight;
                window.removeEventListener('resize', handleWindowSize);
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
                this.get('infoBoxProj').style.display = 'none';
                this.get('infoBoxState').style.display = 'none';
                this.get('infoBoxInfo').innerHTML = `<p>${this.X.length.toLocaleString("en-US")} points.</p>`;
            }
        });
        
        this.get('infoBoxProjButton').addEventListener('click', () => {
            let el = this.getInput('infoBoxProj');
            toggleVisible(el);
            if (el.style.display != 'none') {
                let matStr = 'projection <- cbind(\n    c(';
                matStr += this.proj.map(line => line.map(
                        (item,i) => (item/this.scale[i]).toFixed( Math.ceil(Math.log10(Math.max(0,this.scale[i]))+4) )
                    ).join(',')).join('),\n    c(');
                matStr += '))\nprojected <- as.matrix(X) %*% projection';
                this.getInput('infoBoxProj').value = matStr;
            }
        });
        
        this.get('infoBoxStateButton').addEventListener('click', () => {
            let el = this.getInput('infoBoxState');
            toggleVisible(el);
            if (el.style.display != 'none')
                el.value =  JSON.stringify(this.getState(), null, 4);
        });
        
        // Play button
        this.get('playButton').addEventListener('click', () => this.setState({ playing: !this.playing }));
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
    
    /* Notify listeners of label checkbox change. */
    emitChangeFilter() {
        setTimeout(() => this.dispatchEvent(new Event("changeFilter")), 0);
    }
    
    emitChangeSelectionIfNeeded() {
        if (!this.selectionChanged) return;
        this.selectionChanged = false;
        setTimeout(() => this.dispatchEvent(new Event("changeSelection")), 0);
    }
    
    
    /**
     * Show data in the widget. Use "null" to clear the widget.
     *
     * data.X A row-major matrix, where each row represents a point and each column represents a variable.
     *
     * data.colnames A name for each column in X.
     *
     * data.group Group number for each point. Integer values starting from 0.
     *
     * data.levels Group names for each group in data.group.
     *
     * [data.scale] Scale for each column.
     *
     * [data.center] Center for each column.
     *
     * [data.rownames] A name for each point.
     *
     * [data.extraAxes] A matrix with each column defining a projection of interest.
     *
     * [data.extraAxesNames] A name for each extra axis.
     *
     * [data.lineFrom] Rows of X to draw lines from.
     *
     * [data.lineTo] Rows of X to draw lines to.
     *
     * [data.lineColors] Color for each line. 
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
            extraAxesNames?: string[],
            lineFrom?: number[],
            lineTo?: number[],
            lineColors?: string[],
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
        
        this.center = data.center || Array(this.m).fill(0);
        this.scale = data.scale || Array(this.m).fill(1);
        
        // Shuffling is not optional.
        this.permutor = permutation(this.n);
        this.unpermutor = Array(this.n);
        for(let i=0;i<this.n;i++) 
            this.unpermutor[this.permutor[i]] = i;
        
        this.X = this.permutor.map(i => data.X[i]);
        
        // Store data internally in centered and scaled form.
        this.X = this.X.map(item => item.map((value, i) => 
            (value-this.center[i])/this.scale[i] ));
        
        if (!data.rownames || data.rownames.length == 0) {
            this.rownames = [ ];
        } else {
            let rownames = data.rownames;
            this.rownames = this.permutor.map(i => rownames[i]);
        }
        
        this.colnames = data.colnames;
        
        this.lineFrom = (data.lineFrom || []).map(i => this.unpermutor[i]);
        this.lineTo = (data.lineTo || []).map(i => this.unpermutor[i]);
        this.lineColors = (data.lineColors || []);
        
        // Default to semi-transparent black lines
        if (this.lineFrom.length && !this.lineColors.length)
            this.lineColors = this.lineFrom.map(()=>"#00000088");
        
        this.axes = [ ];
        
        if (data.extraAxes && data.extraAxesNames)
        for(let i=0;i<data.extraAxes[0].length;i++) {
            let proj = data.extraAxes.map(row => row[i]);
            let center = vecDot(proj, this.center);
            let projFromScaled = proj.map((value,j) => value*this.scale[j]);
            let scale = Math.sqrt(vecDot(projFromScaled,projFromScaled));
            let unit = vecScale(projFromScaled, 1/scale);
            this.axes.push({ 
                name: data.extraAxesNames[i],
                unit: unit,
                scale: scale,
                center: center,
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
                halfWidth:0, halfHeight:0, selected:0,
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
                halfWidth:0, halfHeight:0, selected:0,
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
        // At least in pkgdown vignettes, htmlwidgets sends weird resize requests while fullscreen.
        // However the htmlwidgets interface no longer passes any resize requests along, so all is fine.
        
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
        
        this.get('playButton').innerHTML = this.playing ? pauseSvg : playSvg;
        
        // Clean up and return if no data.
        if (!this.haveData) {
            // Clear any old display
            this.get('messageArea').innerText = '';
            this.overlay.style.opacity = "0";
            let ctx = this.canvas.getContext("2d")!;
            ctx.scale(1,1);
            ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
            return;
        }
        
        this.configureScales();
        
        /* Draggable labels */
        
        let overlay = select(this.overlay);
        
        overlay.selectAll('*').remove();
        
        this.mouseInCheckbox = false;

        let thys = this; //sigh
        
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
                        .on('change',function(e,d) { 
                            d.active = this.checked; 
                            thys.emitChangeFilter();
                        })
                        .on('mouseover',() => { this.mouseInCheckbox = true; })
                        .on('mouseout',() => { this.mouseInCheckbox = false; });
                    div.append('span');
                    return div;
                }
            );
        
        divs
            .style('cursor','grab')
            .on('mouseover', (e,d)=>{ d.selected += 1; refreshLabels(); })
            .on('mouseout', (e,d)=>{ d.selected = Math.max(0,d.selected-1); refreshLabels(); });
        
        divs
            .select('span')
            .text(d=>d.label)
            .style('color',d=>d.color);
                
        divs.each(function (d) {
            d.halfWidth = this.offsetWidth/2;
            d.halfHeight = this.offsetHeight/2;
        });

        function refreshLabels() {
            let maxX = thys.xScaleUnit.invert(thys.width);
            for(let item of thys.labelData) {
                item.x = Math.max(-1,Math.min(maxX, item.x));
                item.y = Math.max(-1,Math.min(1,    item.y));
            }
            
            divs
                .style('left',d=>thys.xScaleUnit(d.x)-d.halfWidth+'px')
                .style('top',d=>thys.yScaleUnit(d.y)-d.halfHeight+'px')
                .style('background',d=>d.selected?'#aaa':'#ddd');
        }

        let makeDraggable = drag()
            .subject(function (e,d) {
                return { x:d.x, y:d.y };
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
                
                let [x,y] = locateEventInElement(e.sourceEvent, thys.canvas);
                d.x = thys.xScaleUnit.invert(x);
                d.y = thys.yScaleUnit.invert(y);
                refreshLabels();
            })
            .on('end', function(e,d) {
                if (!thys.dragging)
                    return;
                
                thys.dragging = false;
                this.style.cursor = 'grab';
                d.selected = Math.max(0,d.selected-1);
            });
        makeDraggable(divs);
        
        /* Set all as not selected. 
           Reposition labels that are not currently in use. */
        let cols=Math.ceil((25*this.labelData.length)/(this.size-40));
        for(let i=0;i<this.labelData.length;i++) {
            let d = this.labelData[i];
            d.selected = 0;
            
            if (d.x < 1) continue;
            
            let col = i % cols, row = (i-col)/cols;
            d.x = this.xScaleUnit.invert( this.size+10+d.halfWidth+(i%cols)*(this.width-this.size-10)/cols );
            d.y = this.yScaleUnit.invert( 20+row*25 );
        }
        
        refreshLabels();
        
        this.scheduleFrameIfNeeded();
    }
    
    configureScales() {
        this.zoom = Math.pow(10, -this.getNumber('zoomInput'));
        
        this.xScaleUnit = scaleLinear()
            .domain([-1,1]).range([2.5,this.size-2.5]);
        this.yScaleUnit = scaleLinear()
            .domain([-1,1]).range([this.size-2.5,2.5]);
            
        this.xScale = scaleLinear()
            .domain([-this.zoom,this.zoom]).range([2.5,this.size-2.5]);
        this.yScale = scaleLinear()
            .domain([-this.zoom,this.zoom]).range([this.size-2.5,2.5]);
        
        this.xScaleClamped = this.xScale.copy().clamp(true);
        this.yScaleClamped = this.yScale.copy().clamp(true);
    }
    
    /**
     * Get the current widget state.
     */
    getState() {
        let result = { } as any;
        
        result.playing = this.playing;
        
        result.axesOn = this.getChecked('axesCheckbox');
        result.heatOn = this.getChecked('heatCheckbox');
        result.guideType = this.getString('guideSelect');
        result.labelAttractionOn = this.getChecked('labelCheckbox');
        
        result.damping = this.getNumber('dampInput');
        result.heat = this.getNumber('heatInput');
        result.guide = this.getNumber('guideInput');
        result.labelAttraction = this.getNumber('labelInput');
        result.zoom = this.getNumber('zoomInput');
        result.brush = this.getNumber('brushInput');
        
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
        let needChangeFilter = false;
        let needChangeSelection = false;
        
        if (typeof state == "string")
            state = JSON.parse(state);
            
        if (!state)
            return;
        
        if (has(state,'playing')) {
            // Don't leap forward in time when we start playing again.
            if (!this.playing && state.playing)
                this.lastTime = 0;
            this.playing = state.playing;
        }
        
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
        
        if (has(state,'zoom'))
            this.getInput('zoomInput').value = state.zoom;
        
        if (has(state,'brush'))
            this.getInput('brushInput').value = state.brush;
        
        if (has(state,'labelInactive')) {
            for(let item of this.labelData)
                item.active = !state.labelInactive.includes(item.label);
            needChangeFilter = true;
        }
        
        if (has(state,'labelPos')) {
            for(let item of this.labelData) {
                if (has(state.labelPos,item.label)) {
                    item.x = state.labelPos[item.label][0];
                    item.y = state.labelPos[item.label][1];
                } else {
                    item.x = 1;
                }
            }
        }
        
        if (has(state,'projection'))
            this.proj = Array.from(state.projection.map(item => Array.from(item)));
        
        if (has(state,'selection')) {
            if (state.selection === null)
                this.selection = null;
            else
                this.selection = this.permutor.map(i => state.selection[i]);
            this.selectionChanged = true;
            needChangeSelection = true;
        }
        
        if (has(state,'filter')) {
            if (state.filter === null)
                this.filter = null;
            else
                this.filter = this.permutor.map(i => state.filter[i]);
        }
        
        
        this.configure();
        
        if (needChangeFilter) 
            this.emitChangeFilter();
        if (needChangeSelection)
            this.emitChangeSelectionIfNeeded();
    }
    
    
    scheduleFrameIfNeeded() {
        if (this.frameScheduled || !this.haveData)
            return;
        
        window.requestAnimationFrame(this.doFrame.bind(this))
        this.frameScheduled = true;
    }
    
    
    /*  Update display.
    
        Also updates selection if mouse is down.
        
        Also schedules another frame if needed.
     */
    doFrame(time: number) {
        this.frameScheduled = false;
        if (!this.haveData)
            return;
        
        time /= 1000.0; //Convert to seconds
        
        let elapsed = 0;
        if ((this.playing || this.tugging) && this.lastTime != 0) {
            elapsed = time - this.lastTime;
            
            this.fps.push( Math.round(1/elapsed) );
            if (this.fps.length > 100) this.fps.shift();
        }
        this.lastTime = time;
        
        this.compute(elapsed);
        
        this.configureScales();
        
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
        
        
        // Points within brush distance, for brushing and row label
        let brushRadius = this.size * 0.05 * Math.pow(10, this.getNumber('brushInput'));
        let brushPoints: {index:number,d2:number}[] = [ ];
        if (this.mouseX < this.size) {
            for(let i=0;i<this.n;i++) {
                if (!this.pointActive[i])
                    continue;

                let d2 = (this.xScaleClamped(this.xy[0][i])-this.mouseX)**2+
                            (this.yScaleClamped(this.xy[1][i])-this.mouseY)**2;
                if (d2 > brushRadius**2) 
                    continue;

                brushPoints.push({ index:i, d2: d2 });
            }
            brushPoints.sort((a,b) => a.d2-b.d2);
        }
        
        // Respond to right-mouse tugging
        if (this.rightMouseWentDown) {
            this.tugPoints = brushPoints.map(item => item.index);
            this.rightMouseWentDown = false;
        }
        this.tugging = this.rightMouseDown && this.tugPoints.length>0;
        if (this.tugging) {
            this.tugX = this.xScale.invert(this.mouseX);
            this.tugY = this.yScale.invert(this.mouseY);
        }
        
        // Update selection.
        // This is kind of an odd place to do this.
        if (this.mouseDown || this.mouseWentDown) {
            // Clear selection on mouse down unless shift was pressed.
            if (this.mouseWentDown && !this.mouseShiftKey) {
                this.selection = null;
                this.selectionChanged = true;
            }
            
            if (brushPoints.length) {    
                if (!this.selection) {
                    this.selection = Array(this.n).fill(false);
                    this.selectionChanged = true;
                }
                
                for(let i=0;i<brushPoints.length;i++) {
                    if (!this.selection[brushPoints[i].index]) {
                        this.selection[brushPoints[i].index] = true;
                        this.selectionChanged = true;
                    }
                }
            }
            
            this.mouseWentDown = false;
            //Note: at end of this function, we decide if it's time to emit a changeSelection event
        }
        
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
        let axisScale = 0.75 * this.zoom;
        ctx.strokeStyle = '#ccc';
        
        if (showAxes)
        for(let i=0;i<this.axes.length;i++) {
            let xProj = vecDot(this.proj[0], this.axes[i].unit);
            let yProj = vecDot(this.proj[1], this.axes[i].unit);
        
            ctx.beginPath();
            ctx.moveTo(this.xScale(0), this.yScale(0));
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
            
            ctx.strokeStyle = (!this.selection || (this.selection[a] && this.selection[b])) ? this.lineColors[i] : '#bbbbbb';
            
            // Make short lines thicker so they have equal visual weight to longer lines
            // Clipped for d < 1/4, d > 1
            let d = Math.sqrt( (this.xy[0][a]-this.xy[0][b])**2 + (this.xy[1][a]-this.xy[1][b])**2 );
            d = Math.max(1/4,Math.min(1,d));
            ctx.lineWidth = 0.25/d;
            
            ctx.beginPath();
            ctx.moveTo(this.xScaleClamped(this.xy[0][a]), this.yScaleClamped(this.xy[1][a]));
            ctx.lineTo(this.xScaleClamped(this.xy[0][b]), this.yScaleClamped(this.xy[1][b]));
            ctx.stroke();
        }
        
        ctx.lineWidth = 1;

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
            ox = vecScale(ox, 0.03/Math.max(1e-30,Math.sqrt(vecDot(ox,ox)))); //Avoid very occasional divide by zero
                        
            // Hack to speed up rug drawing by rounding positions, 
            // then only drawing each position once.
            let rug:Map<number,string> = new Map();
            let rounding = this.size / this.zoom;
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
        
        // Brushing indicator
        if (this.mousing && !this.tugging && brushPoints.length) {
            ctx.fillStyle = '#0000ff11';
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, brushRadius, 0, 2 * Math.PI, false);
            ctx.fill();
        }
                
        //Text section
        ctx.save()
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
                
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
        
        // Row label
        if (this.mousing && this.rownames.length) {
            ctx.font = `15px sans-serif`;
            ctx.strokeStyle = `#fff`;
            ctx.fillStyle = `#000`;
            for(let i=Math.min(brushPoints.length,1)-1;i>=0;i--) {
                let j=brushPoints[i].index;
                let x = this.xScaleClamped(this.xy[0][j]), y = this.yScaleClamped(this.xy[1][j]);
                ctx.strokeText(this.rownames[j], x, y);
                ctx.fillText(this.rownames[j], x, y);
            }
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
        
        //Hints and messages text
        let hint = '';
        
        if (this.tugging) {
            hint = "right drag to tug\n";
        } else if (this.mouseInCheckbox && selected.length) {
            if (selected[0].active)
                hint = "click to hide\n";
            else
                hint = "click to show\n";
        } else if (selectedAxis !== null || selectedLevel !== null) {
            hint = "drag to position\n";
        } else if (brushPoints.length && !this.mouseDown) {
            if (this.selection)
                hint = "shift+click to enlarge\n";
            else
                hint = "left click to select\nright drag to tug\n";
        } else if (this.selection && this.mousing && !brushPoints.length && !this.mouseDown) {
            hint = "click to clear\n";
        }
        
        this.get('messageArea').innerText = `${this.computeMessage || hint}${Math.min(...this.fps)} to ${Math.max(...this.fps)} FPS`;
        
        
        // Schedule another frame if needed
        if (this.playing || this.tugging) {
            if (!elementVisible(this.container)) {
                // Don't leap forward in time when we become visible again.
                this.lastTime = 0;
                // We aren't visible. Wait a while.
                window.setTimeout(this.scheduleFrameIfNeeded.bind(this), 100);
            } else {
                // Schedule a frame normally.
                // Add a slight delay so we never run at 100% CPU.
                // (I think the browser may start putting off things that it really shouldn't if we run at 100%.)
                window.setTimeout(this.scheduleFrameIfNeeded.bind(this), 5);
            }
        }
        
        // Emit updated selection
        if (this.selectionChanged && !this.mouseDown)
            this.emitChangeSelectionIfNeeded();
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
        
        
        if (this.tugging) {
            // Calculate tugging based position update.
            let tugAmount = Math.min(100, 1/elapsed);
            
            let tugCenter = zeros(this.m);
            for(let i=0;i<this.tugPoints.length;i++)
               tugCenter = vecAdd(tugCenter, this.X[this.tugPoints[i]]);
            tugCenter = vecScale(tugCenter, 1/this.tugPoints.length);
            let currentX = vecDot(tugCenter, proj[0]);
            let currentY = vecDot(tugCenter, proj[1]);
            let length2 = vecDot(tugCenter, tugCenter) + 1e-3;
            vel[0] = vecScale(tugCenter, (this.tugX-currentX)/length2*tugAmount);
            vel[1] = vecScale(tugCenter, (this.tugY-currentY)/length2*tugAmount);
            // Note this removes any existing velocity!
            // Don't do any other velocity adjustments.
            doHeat = false;
            doAttraction = false;
            whatGuide = 'none';
        }
        
        
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
            let remove = zeroMat(2, this.m);
            for(let i=0;i<u.length;i++) {
                // Don't nuke tiny directions (could arise from redundant nukings). TODO: make tolerance level an option
                if (q[i] < maxQ*1e-6) {
                    anyDropped = true;
                    continue;
                }
                let vec = u[i];
                for(let j=0;j<2;j++) {
                    // Remove any velocity and part of the projection along u[i]
                    remove[j] = vecAdd(remove[j], 
                        vecScale(vec, -vecDot(vec, vel[j]) -nuke_amount*vecDot(vec, proj[j])));
                }
            }
            
            // Don't introduce spin while removing
            matAddInto(vel, removeSpin(remove, proj));
        }
                
        if (tooMany) this.computeMessage += 'Error: too many axes removed\n';
        if (anyDropped) this.computeMessage += 'Note: redundant axes removed\n';
        
        
        // Velocity step        
        let newProj = matAdd(proj, matScale(vel, elapsed));
        
        // Project onto Stiefel manifold                
        let { u, v, q } = SVD(matTranspose(newProj));
        matTcrossprodInto(newProj, v, u);
        
        // "Position based dynamics"
        vel = matScale(matAdd(newProj,matScale(proj,-1)), 1/elapsed);
        
        // No velocity during tugging
        if (this.tugging)
            vel = [ zeros(this.m), zeros(this.m) ];
        
        this.proj = newProj;
        this.vel = vel;
    }
}

