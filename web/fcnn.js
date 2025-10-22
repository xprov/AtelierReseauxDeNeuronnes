
////////////////////////////////////////////////////////
//
// Fully connexted neural network (begin)
//

ActivationFunctions = {
  "Sigmoid(1)" : function(x) {return 1.0 / (1.0 + Math.exp(-1.0 * x));}
}

class Neuron {
  constructor(fcnn, layer, index, isBiais) {
    this.fcnn = fcnn;
    this.layer = layer;
    this.index = index;
    this.isBiais = isBiais;
    this.value = (isBiais) ? 1.0 : 0.0;
    this.activation = 0.0;
    this.center = [0,0];
    this.topLeft = [0,0];
    this.bottomRight = [0,0];
  }

  update(activation, value) {
    this.activation = activation;
    this.value = value;
  }

  // todo fcnn should compute all these and simply affect the values to each neuron
  updatePosition() {
    var opt = this.fcnn.displayOptions;
    var size = opt.neuronsSize;
    var halfSize = Math.round(0.5*size);

    if (opt.inputDisposition === "column") {
      this.center = [
        Math.round((0.5+this.layer)*opt.horizontalSpacing),
        Math.round((1.0+this.index)*opt.verticalSpacing)
      ];
    }

    else if (opt.inputDisposition === "square") {
      var inputSquareSize = Math.ceil(Math.sqrt(this.fcnn.layers[0]));
      if (this.layer == 0) { // input node
        var row = Math.floor(this.index / inputSquareSize);
        var col = this.index % inputSquareSize;
        this.center = [
          Math.round(0.5*opt.horizontalSpacing + col*size),
          Math.round(opt.verticalSpacing + row*size)
        ];
      } else {
        this.center = [
          Math.round((0.5+this.layer)*opt.horizontalSpacing + (inputSquareSize-1)*size),
          Math.round((1.0+this.index)*opt.verticalSpacing  )
        ];
      }
    }
    this.topLeft     = [this.center[0]-halfSize, this.center[1]-halfSize];
    this.bottomRight = [this.center[0]+halfSize, this.center[1]+halfSize];
  }

  isClicked(x, y) {
    return (!this.isBiais) 
      && this.topLeft[0] <= x && x <= this.bottomRight[0] 
      && this.topLeft[1] <= y && y <= this.bottomRight[1];
  }

  toString() {
    return "Neuron(layer=" + this.layer 
      + ", index=" + this.index 
      + ", value=" + this.value 
      + ", center=" + this.center 
      + ")";
  }

  displaySelf(ctx) {
    var x = this.topLeft[0];
    var y = this.topLeft[1];
    var size = this.fcnn.displayOptions.neuronsSize;
    if (!this.isBiais) {
      ctx.beginPath();
      if (Number.isNaN(this.value)) {
        ctx.fillStyle = "red";
      } else {
        var intensity = Math.floor(255.0 * this.value);
        ctx.fillStyle = "rgb("+intensity+"," + intensity + "," + intensity + ")";
      }
      ctx.fillRect(x, y, size, size);
      ctx.lineWidth = "2";
      ctx.strokeStyle = "rgb(50,50,50)";
      ctx.strokeRect(x, y, size, size);
    } else {
      ctx.beginPath();
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = "2";
      ctx.arc(this.center[0], this.center[1], size/2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
}

class FCNNDisplayOptions {
  constructor() {
    this.neuronsSize       = Number(document.getElementById("neuronsSizeSlider").value);
    this.horizontalSpacing = Number(document.getElementById("horizontalSpacingSlider").value);
    this.verticalSpacing   = Number(document.getElementById("verticalSpacingSlider").value);
    this.showConnexions    = document.getElementById("showConnexions").checked;
    this.showBiais         = document.getElementById("showBiais").checked;
    var radioColumn        = document.getElementById("radioDispositionColumn");
    if (radioColumn.checked) {
      this.inputDisposition = "column";
    }
    var radioSquare = document.getElementById("radioDispositionSquare");
    if (radioSquare.checked) {
      this.inputDisposition = "square";
    }
    this.morphologicalFactor = 1.0;
  }
}

class FCNN {
  constructor(text) {
    text = text.trim();
    var layersInText = null;
    this.activationFunctionsName = null;
    var weightsInText = null;
    var labelsInText = null;
    text.split('\n').forEach( line => {
      if (line.startsWith("layerSizes")) {
        layersInText = line;
      } else if (line.startsWith("activation")) {
        this.activationFunctionsName = line.split(" ")[1];
      } else if (line.startsWith("weights")) {
        weightsInText = line;
      } else if (line.startsWith("labels")) {
        labelsInText = line.substring(7);
      }
    });

    if (layersInText == null) {
      throw "Parsing error. Error reading layers' sizes";
    }

    if (this.activationFunctionsName == null) {
      throw "Parsing error. Error reading activation function";
    }

    if (weightsInText == null) {
      throw "Parsing error. Error reading weights";
    }

    // parse layers' sizes
    var p0 = layersInText.indexOf('[');
    var p1 = layersInText.indexOf(']');
    var layers = layersInText.substring(p0+1, p1);
    this.layers = []
    layers.split(',').forEach(k => {this.layers.push(parseInt(k))});
    this.numLayers = this.layers.length;
    this.numInputNeurons = this.layers[0];
    this.numOutputNeurons = this.layers[this.numLayers-1];

    // parse activation function
    this.activationFunction = ActivationFunctions[this.activationFunctionsName];
    if (typeof this.activationFunction == 'undefined') {
      throw "Parsing error. Unknown activation function";
    }

    // built neurons
    // in this implementation, a neuron is just a number (float)
    // each layer of neurons is stored in an array
    this.neurons = [];
    for (var i=0; i<this.numLayers; i++) {
      var layer = [];
      for (var j=0; j<this.layers[i]; j++) {
        layer.push(new Neuron(this, i, j, false));
      }
      if (i != this.numLayers-1) {
        // to each layer, except the last one, we add an extra neuron with value 1.
        // This neuron represents the biais ans will never be updated.
        var biais = new Neuron(this, i, this.layers[i], true);
        layer.push(biais);
      }
      this.neurons.push(layer);
    }

    // parse weights
    // this.weights[k][i][j] is the weight of the link from the i-th neuron of
    // the k-th level to the j-th neuron of the (k+1)-th layer.
    var weightsAsText = weightsInText.split(' ');
    var index = 1;
    this.weights = []
    for (var k=0; k<this.numLayers-1; k++) {
      var layersSize = this.layers[k];
      var nextLayersSize = this.layers[k+1];
      var outOfLayerK = [];
      for (var i=0; i<=layersSize; i++ ) {
        var outOfNeuronI = [];
        for (var j=0; j<nextLayersSize; j++) {
          if (index == weightsAsText.length) {
            throw "Insuficient number of weights given de layers' sizes";
          }
          var weight = parseFloat(weightsAsText[index++]);
          if (Number.isNaN(weight)) {
            throw "Invalid weight (=" + weightsAsText[index-1] + ") must be float";
          }
          outOfNeuronI.push(weight);
        }
        outOfLayerK.push(outOfNeuronI);
      }
      this.weights.push(outOfLayerK)
    }

    this.displayOptions = new FCNNDisplayOptions();
    this.updateNeuronsPositions();


    // Parse labels, if they are specified
    this.labels = null;
    if (labelsInText != null) {
      this.labels = labelsInText.split(",");
    }
  }

  updateNeuronsPositions() {
    this.neurons.forEach( layer => {layer.forEach( n => {n.updatePosition();})});
  }

  moveInputValuesUp() {
    var input = [];
    if (this.displayOptions.inputDisposition == "column") {
      var n = this.numInputNeurons;
      for (var i=0; i<n-1; i++) {
        input[i] = this.neurons[0][i+1].activation;
      }
      input[n-1] = this.neurons[0][0].activation;
    } else {
      // square display
      var N = this.numInputNeurons;
      var n = Math.ceil(Math.sqrt(N));
      for (var i=0; i<N-n; i++) {
        input[i] = this.neurons[0][i+n].activation;
      }
      for (var i=0; i<n; i++) {
        input[N-n+i] = this.neurons[0][i].activation;
      }
    }
    this.evaluateWithNewInput(input);
    fcnn.displaySelf();
  }

  moveInputValuesDown() {
    var input = [];
    if (this.displayOptions.inputDisposition == "column") {
      var n = this.numInputNeurons;
      for (var i=1; i<n; i++) {
        input[i] = this.neurons[0][i-1].activation;
      }
      input[0] = this.neurons[0][n-1].activation;
    } else {
      // square display
      var N = this.numInputNeurons;
      var n = Math.ceil(Math.sqrt(N));
      for (var i=0; i<n; i++) {
        input[i] = this.neurons[0][N-n+i].activation;
      }
      for (var i=n; i<N; i++) {
        input[i] = this.neurons[0][i-n].activation;
      }
    }
    this.evaluateWithNewInput(input);
    fcnn.displaySelf();
  }

  moveInputValuesLeft() {
    var input = [];
    if (this.displayOptions.inputDisposition == "column") {
      return ; // nothing to do
    }
    // square display
    var N = this.numInputNeurons;
    var n = Math.ceil(Math.sqrt(N));
    for (var i=0; i<N; i++) {
      if (i % n != n-1) {
        input[i] = this.neurons[0][i+1].activation;
      } else {
        input[i] = this.neurons[0][i-(n-1)].activation;
      }
    }
    this.evaluateWithNewInput(input);
    fcnn.displaySelf();
  }

  moveInputValuesRight() {
    var input = [];
    if (this.displayOptions.inputDisposition == "column") {
      return ; // nothing to do
    }
    // square display
    var N = this.numInputNeurons;
    var n = Math.ceil(Math.sqrt(N));
    for (var i=0; i<N; i++) {
      if (i % n == 0) {
        input[i] = this.neurons[0][i+(n-1)].activation;
      } else {
        input[i] = this.neurons[0][i-1].activation;
      }
    }
    this.evaluateWithNewInput(input);
    fcnn.displaySelf();
  }


  /**
   * op take value in ["erosion", "dilatation"]
   *
   * should only be used when input cells are in the "square" position aka
   * input is an image.
   */
  morphologicalOperation(op) {
    var f, d;
    if (op == "erosion") {
      f = Math.min;
      d = Number.POSITIVE_INFINITY;
    } else if (op == "dilatation") {
      f = Math.max;
      d = 0.0;
    } else {
      console.log("unknown morphological operation (" + op + ")");
    }
    var N = this.numInputNeurons; // total number of pixels
    var n = Math.ceil(Math.sqrt(N)); // image is n x n
    var input = [];
    var defaultValue = 0.0;
    var factor = this.displayOptions.morphologicalFactor;
    for (var i=0; i<n; i++) {
      for (var j=0; j<n; j++) {
        var pos = n*i + j;
        var myValue     = this.neurons[0][pos      ].activation;
        var value_left  = (j != 0  ) ? this.neurons[0][pos-1    ].activation : d;
        var value_right = (j != n-1) ? this.neurons[0][pos+1    ].activation : d;
        var value_above = (i != 0  ) ? this.neurons[0][pos-n].activation : d;
        var value_below = (i != n-1) ? this.neurons[0][pos+n].activation : d;
        var x = f(myValue, value_left, value_right, value_above, value_below);
        input[pos] = (1.0-factor)*myValue + factor*x;
      }
    }

    this.evaluateWithNewInput(input);
    fcnn.displaySelf();

  }

  erosion() {
    if (this.displayOptions.inputDisposition == "column") {
      return ; // nothing to do
    }
    this.morphologicalOperation("erosion");
  }

  dilatation() {
    if (this.displayOptions.inputDisposition == "column") {
      return ; // nothing to do
    }
    this.morphologicalOperation("dilatation");
  }

  treshold() {
    if (this.displayOptions.inputDisposition == "column") {
      return ; // nothing to do
    }

    var threshold_value = 0.5;

    var N = this.numInputNeurons; // total number of pixels
    var input = [];
    for (var i=0; i<N; i++) {
      var value  = this.neurons[0][i].activation;
      if (value < threshold_value) {
        value = 0.0
      }
      if (value > 1.0 - threshold_value) {
        value = 1.0;
      }
      input[i] = value;
    }
    this.evaluateWithNewInput(input);
    fcnn.displaySelf();
  }



  /**
   * Assing the given values to the input neurons and updates all layers
   * consequently.
   */
  evaluateWithNewInput(input) {

    // update input neurons
    for (var i=0; i<this.layers[0]; i++) {
      if  (i < input.length)
        this.neurons[0][i].update(input[i], input[i]); // no actication function on input nodes
      else
        this.neurons[0][i].update(0.0, 0.0); // unspecified input, set to 0
    }

    this.computeNonInputLayers();
  }

  evaluateWithActualInput() {
    this.computeNonInputLayers();
  }

  computeNonInputLayers() {
    // update all other layers
    for (var k=1; k<this.numLayers; k++) {
      for (var j=0; j<this.layers[k]; j++) {
        var activation = 0.0;
        for (var i=0; i<=this.layers[k-1]; i++) {
          activation += this.neurons[k-1][i].value * this.weights[k-1][i][j];
        }
        this.neurons[k][j].update(activation, this.activationFunction(activation));
      }
    }
    return this.getOutput();
  }

  getOutput() {
    return this.neurons[this.numLayers-1].map(n => {return n.value});
  }


  toHTML() {
    return "<ul>"
      + "<li>  Nombre de couches : " + this.numLayers + "</li>"
      + "<li>  Taille de la couche d'entrée : " + this.layers[0] + "</li>"
      + "<li>  Taille de la couche de sortie : " + this.layers[this.numLayers-1] + "</li>"
      + "<li>  Taille de toutes les couches : (entrée) " + this.layers + " (sortie)</li>"
      + "<li>  Fonction d'activation : " + this.activationFunctionsName + "</li>"
      + "</ul>"
  }

  displaySelf() {
    myDisplayArea.clear();
    var ctx = myDisplayArea.context;

    // connexions between neurons
    if (this.displayOptions.showConnexions) {
      for (var k=1; k<this.numLayers; k++) {
        for (var j=0; j<this.layers[k]; j++) {
          var to = this.neurons[k][j].center;
          var numInPreviousLayer = (this.displayOptions.showBiais) ? this.layers[k-1]+1 : this.layers[k-1];
          for (var i=0; i<numInPreviousLayer; i++) {
            var from = this.neurons[k-1][i].center;
            ctx.beginPath();
            ctx.moveTo(from[0], from[1]);
            ctx.lineTo(to[0], to[1]);
            ctx.stroke(); 
          }
        }
      }
    }

    // neurons
    this.neurons.forEach(layer => {layer.forEach(n => {
      if (this.displayOptions.showBiais || !n.isBiais) n.displaySelf(ctx)
    })});

    // Output neurons' labels
    if (this.labels != null) {
      var outputLayer = this.neurons[this.numLayers-1];
      for (var i=0; i<Math.min(Math.min(this.numOutputNeurons, this.labels.length)); i++) {
        var label = this.labels[i];
        var neuron = outputLayer[i];
        //console.log(neuron);
        //console.log(label);
        var x = neuron.center[0] + 0.75*this.displayOptions.neuronsSize;
        var y = neuron.bottomRight[1] - 0.2*this.displayOptions.neuronsSize;
        ctx.fillStyle = "black";
        ctx.font = "" + this.displayOptions.neuronsSize + "px Arial";
        ctx.fillText(label, x, y);
      }
    }
  }

  getNeuronUnderClick(x, y) {
    for (var i=0; i<this.layers[0]; i++) {
      var neuron = this.neurons[0][i];
      if (neuron.isClicked(x, y)) {
        return neuron;
      }
    }
  }

  setAllInputsToOne() {
    this.neurons[0].map(n => {return "0.0"}).join(" ");
  }

  setAllInputsToZero() {
    this.neurons[0].map(n => {return "1.0"}).join(" ");
  }
}

//
// Fully connexted neural network (end)
//
////////////////////////////////////////////////////////








////////////////////////////////////////////////////////
  //
  // Page interaction (begin)
  //

  var fcnn = null;

/**
 * Load the neural network as described in the importBox text area.
 */
function importFCNN() {
  var inputText = document.getElementById("importBox").value;
  inputText = ''+inputText.trim().replace(/ +(?= )/g,''); // replace multiple spaces by a single one
  try {
    fcnn = new FCNN(inputText);
    fcnn.displaySelf();
    //document.getElementById("fcnn-display-area").innerHTML = "Réseau de neuronnes importé avec succès :<br>" + fcnn.toHTML();
  } catch (err) {
    document.getElementById("fcnn-display-area").innerHTML = "Erreur à l'importation, réseau invalide. (" + err + ")";
  }
}

/**
 * Load the neural network as described in the importBox text area and
 * evaluates it using the input values specified in the inputValues.
 */
function evaluateFCNNwithTextInput() {
  if (fcnn == null) {
    document.getElementById("output-display-area").innerHTML = "Erreur, vous devez d'abord importer un RNCC valide.";
    return ;
  }
  var inputText = document.getElementById("importBox").value;
  var inputValues = document.getElementById("inputValues").value;
  inputValues = ''+inputValues.trim().replace(/ +(?= )/g,''); // remove multple spaces by a single one
  var input = null;
  if (inputValues.indexOf(",") != -1) {
    input = inputValues.split(",").map(function(x) {return parseFloat(x)});
  } else {
    input = inputValues.split(" ").map(function(x) {return parseFloat(x)});
  }

  fcnn.evaluateWithNewInput(input);

  outputValues = fcnn.getOutput();
  outputHTML = outputValues.map(function(valeur, index) {
    return "&emsp;Neuron " + (index+1) + " : " + valeur;
  }).join("<br>");
  document.getElementById("output-display-area").innerHTML = "Valeurs des neurones en sortie :<br>" +  outputHTML;

  fcnn.displaySelf();
}

// Pressing the ENTER key in the import box will trigger the 'importer'
// button.
var importBox = document.getElementById("importBox");
// Execute a function when the user releases a key on the keyboard
importBox.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    document.getElementById("importButton").click();
  }
}); 






function setAllInputsToZero() {
  let input = []
  for (let i=0; i<fcnn.numInputNeurons; i++) {
    input.push(0.0);
  }
  fcnn.evaluateWithNewInput(input);
  fcnn.displaySelf();
}

function setAllInputsToOne() {
  let input = []
  for (let i=0; i<fcnn.numInputNeurons; i++) {
    input.push(1.0);
  }
  fcnn.evaluateWithNewInput(input);
  fcnn.displaySelf();
}

function moveLeft() {
  fcnn.moveInputValuesLeft();
}

function moveDown() {
  fcnn.moveInputValuesDown();
}

function moveUp() {
  fcnn.moveInputValuesUp();
}

function moveRight() {
  fcnn.moveInputValuesRight();
}

function dilatation() {
  fcnn.dilatation();
}

function erosion() {
  fcnn.erosion();
}

function treshold() {
  fcnn.treshold();
}



//
////////////////////////////////////////////////////////










/**************************************************
 * 
 *  Graphic display (begin)
 */ 


var myDisplayArea = {
  canvas : document.createElement("canvas"),
  start : function() {
    this.canvas.width = Math.floor(window.innerWidth*0.9);
    this.canvas.height = Math.floor(this.canvas.width*0.5);
    this.context = this.canvas.getContext("2d");
    this.oncontextmenu = function(e) {
      return false;
    };
    document.body.appendChild(this.canvas);
  },

  clear : function() {
    var ctx = this.context;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
};

myDisplayArea.start();
myDisplayArea.clear();

var hslider = document.getElementById("horizontalSpacingSlider");
hslider.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.horizontalSpacing = Number(this.value);
    fcnn.updateNeuronsPositions();
    fcnn.displaySelf();
  }
}

var vslider = document.getElementById("verticalSpacingSlider");
vslider.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.verticalSpacing = Number(this.value);
    fcnn.updateNeuronsPositions()
    fcnn.displaySelf();
  }
}

var sslider = document.getElementById("neuronsSizeSlider");
sslider.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.neuronsSize = Number(this.value);
    fcnn.updateNeuronsPositions();
    fcnn.displaySelf();
  }
}

var radioDispositionColumn = document.getElementById("radioDispositionColumn");
radioDispositionColumn.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.inputDisposition = this.value;
    fcnn.updateNeuronsPositions();
    fcnn.displaySelf();
  }
}

var radioDispositionSquare = document.getElementById("radioDispositionSquare");
radioDispositionSquare.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.inputDisposition = this.value;
    fcnn.updateNeuronsPositions();
    fcnn.displaySelf();
  }
}

var showConnexions = document.getElementById("showConnexions");
showConnexions.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.showConnexions = this.checked;
    fcnn.displaySelf();
  }
}

var showBiais = document.getElementById("showBiais");
showBiais.oninput = function() {
  if (fcnn != null) {
    fcnn.displayOptions.showBiais = this.checked;
    fcnn.displaySelf();
  }
}

var islider = document.getElementById("inputValueSlider");
var inputValue = null;
islider.oninput = function() {
  var drawing = document.getElementById("inputValueAsColor");
  var ctx = drawing.getContext("2d");
  ctx.beginPath();
  ctx.fillStyle = "rgb("+this.value+"," + this.value + "," + this.value + ")";
  ctx.fillRect(0, 0, 20, 20);
  ctx.lineWidth = "2";
  ctx.strokeStyle = "black";
  ctx.strokeRect(1, 1, 18, 18);
  var text = document.getElementById("inputValueAsText");
  var value = Number(this.value) / 255.0;
  text.innerHTML = "" + value.toFixed(3);

  inputValue = value;
}
islider.oninput();

var fslider = document.getElementById("morphologicalFactorSlider");
fslider.oninput = function() {
  console.log("slider factor : " + this.value);
  fcnn.displayOptions.morphologicalFactor = this.value / 255.0;
}
//fslider.oninput();


function setPenColorBlack() {
  inputValue = 0;
  document.getElementById("buttonColorBlack").style.border = "6px solid black";
  document.getElementById("buttonColorWhite").style.border = "1px solid black";
}
function setPenColorWhite() {
  inputValue = 1;
  document.getElementById("buttonColorBlack").style.border = "6px solid white";
  document.getElementById("buttonColorWhite").style.border = "6px solid black";
}


/*
 * Graphic display (end)
 *
 ****************************************/








/**
 *
 * Mouse control (begin)
 *
 *******************************************/


// Drag detection 
// Of course it was taken from StackOverflow 
// https://stackoverflow.com/questions/37239710/detecting-clicks-versus-drags-on-an-html-5-canvas
var isDown   = false;   // mouse button is held down
var isMoving = false;   // we're moving (dragging)
var radius   = 9 * 9    // radius in pixels, 9 squared
var firstPos = null;    // keep track of first position
var actualNeuron = null;


function getXY(event) {
  const rect = myDisplayArea.canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  return {x : x, y : y};
}


function simpleClick(x, y) {
  neuron = fcnn.getNeuronUnderClick(x, y);
  if (neuron != null) {
    // update drag-related variables
    actualNeuron = neuron;
    firstPos = {x:x, y:y};

    // update fcnn and display
    neuron.update(inputValue, inputValue);
    //console.log(neuron);
    fcnn.evaluateWithActualInput();
    fcnn.displaySelf();
  }
}


myDisplayArea.canvas.addEventListener('mousedown', function(e) {
  e.preventDefault();
  var pos = getXY(e);
  isDown = true;           // record mouse state
  isMoving = false;        // reset move state
  simpleClick(pos.x, pos.y);
});

myDisplayArea.canvas.addEventListener("mousemove", function(e) {
  if (!isDown) return;     // we will only act if mouse button is down
  if (firstPos == null) return;

  var pos = getXY(e);      // get current mouse position

  // calculate distance from click point to current point
  var dx = firstPos.x - pos.x,
    dy = firstPos.y - pos.y,
    dist = dx * dx + dy * dy;  // skip square-root (see above)

  if (dist >= radius) isMoving = true; // 10-4 we're on the move

  if (isMoving) {
    var neuron = fcnn.getNeuronUnderClick(pos.x, pos.y);
    if (neuron != null && neuron != actualNeuron) {
      actualNeuron = neuron;
      neuron.update(inputValue, inputValue);
      //console.log(neuron);
      fcnn.evaluateWithActualInput();
      fcnn.displaySelf();
    }
  }
});

window.addEventListener("mouseup", function(e) {
  if (!isDown) return;     // no need for us in this case
  isDown = false;          // record mouse state
});




//
// Mouse control (end)
//
////////////////////////////////////////////////////////


document.getElementById("importButton").click();
setAllInputsToZero()
setPenColorWhite();



