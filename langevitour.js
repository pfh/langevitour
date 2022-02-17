
/*
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.13.0/dist/tf.min.js"></script>
<script src="https://unpkg.com/jstat@1.9.5/dist/jstat.js"></script>
<script src="https://unpkg.com/svd-js@1.1.1/build-umd/svd-js.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
*/

let template = `
<div style="position: relative">
  <canvas id=plot width=600 height=600"></canvas>
  &larr; drag labels onto plot
  <svg id=overlay style="position: absolute; left:0; top:0;" width=900 height=600></svg>
</div>
`;



class Langevitour {
    constructor(container, width, height) {
        this.container = container;
        this.container.innerHTML = template;
        this.resize(width, height);
    }
    
    renderValue(X) {
        this.X = X;
    }
    
    resize(width, height) {
        
    }
}
