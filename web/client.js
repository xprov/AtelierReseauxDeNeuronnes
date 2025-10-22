/**
 * Implémentation du client web pour la partie "entraînement d'un réseau de
 * neurones" dans le câdre de la "Classe Techno" 2023.
 */

/**
 * Structure du fichier : 
 *
 * 1. Choix de la tâche : 
 *  - deux boutons permettent de choisir la tâche qui va être utilisée pour
 *    faire l'entraînement.
 *  - Les choix sont : des droites sur une image 3x3 et MNIST.
 *
 * 2. Choix des l'architecture du réseau.
 *  - Un canvas affiche le réseau de neurones et des boutons permettent de modifier : 
 *    - le nombre de couches cachées
 *    - le nombre de neurones sur chacune des couches cachées
 *
 * 3. Communication avec le serveur.
 *  - Deux boutons permettent de communiquer avec le serveur.
 *    - Démarrer l'entraînement du réseau de neurones
 *    - Arrêter l'entraînement du réseau de neurones.
 *  - Lorsque l'entraînement est terminé, un troisième bouton permet de
 *    passer au GUI de visualisation. Où une zone de dessin permet de modifier
 *    la valeur des neurones en entrée.
 */

/*
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 * Section 1 : Choix de la tâche
 *
 * Tâche 1. Reconnaissances de droites sur une image 3x3
 * Tâche 2. MNIST
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 */

// VARIABLES GLOBALES
var SELECTEDTASK = 0;
var LAYERS = [];


function loadTask1() {
  if (SELECTEDTASK != 1) {
    SELECTEDTASK = 1;
    //document.getElementById("task1Button").disabled = true;
    //document.getElementById("task2Button").disabled = false;
    document.getElementById("task1Button").style.border = "ridge black 7px";
    document.getElementById("task2Button").style.border = "solid black 0px";
    document.getElementById("descriptionOfTask1").style.display = "";
    document.getElementById("descriptionOfTask2").style.display = "none";

    LAYERS = [9, 2];
    document.getElementById("inputLayerSize").innerHTML = "" + LAYERS[0];
    document.getElementById("outputLayerSize").innerHTML = "" + LAYERS[1];

    updateAll();
  }
}
function loadTask2() {
  if (SELECTEDTASK != 2) {
    SELECTEDTASK = 2;
    //document.getElementById("task1Button").disabled = false;
    //document.getElementById("task2Button").disabled = true;
    document.getElementById("task1Button").style.border = "solid black 0px";
    document.getElementById("task2Button").style.border = "ridge black 7px";
    document.getElementById("descriptionOfTask1").style.display = "none";
    document.getElementById("descriptionOfTask2").style.display = "";
    document.getElementById("inputLayerSize").innerHTML = 9;
    document.getElementById("outputLayerSize").innerHTML = 2;

    LAYERS = [784, 10];
    document.getElementById("inputLayerSize").innerHTML = LAYERS[0];
    document.getElementById("outputLayerSize").innerHTML = LAYERS[1];

    updateAll();
  }
}



/*
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 *
 * Section 2 : Choix de l'architecture du réseau
 *
 * La couche d'entrée et la couche de sortie sont déterminées par le choix de
 * la tâche.
 *
 * L'utilisateur dispose de boutons pour choisir le nombre de couches cachées.
 * Pour chaque couche cachée, l'utilisateur peut modifier le nombre de neurones
 * sur cette couche.
 *
 *
 *
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 */

const MAXNUMLAYERS = 10;
const MINNUMLAYERS = 2;

const MAXNEURONESINLAYER = 20;
const MINNEURONESINLAYER = 1;


function incrementNumberOfLayers() {
  let n = LAYERS.length;
  if (n < MAXNUMLAYERS) {
    LAYERS.push(LAYERS[n-1]);
    LAYERS[n-1] = 1;
    updateAll();
  }
}

function decrementNumberOfLayers() {
  let n = LAYERS.length;
  if (n > MINNUMLAYERS) {
    LAYERS[n-2] = LAYERS.pop();
    updateAll();
  }
}

function incHiddenLayer(i) {
  if (LAYERS[i] < MAXNEURONESINLAYER) {
    LAYERS[i] += 1;
    document.getElementById("hiddenLayerSize" + i).innerHTML = "" + LAYERS[i];
    updateAll();
  }
}

function decHiddenLayer(i) {
  if (LAYERS[i] > MINNEURONESINLAYER) {
    LAYERS[i] -= 1;
    document.getElementById("hiddenLayerSize" + i).innerHTML = "" + LAYERS[i];
    updateAll();
  }
}


function drawNetwork() {
  console.log("Drawing : " + LAYERS);
  let canvas = document.getElementById("networkCanvas");
  canvas.width = 1000;
  canvas.height = 500;
  let ctx = canvas.getContext("2d");

  const nodeRadius = 10;
  const layersMaxDisplaySize = 20;
  const topPadding = 50;
  const bottomPadding = 50;
  const leftPadding = 50;
  const rightPadding = 50;
  const width = canvas.width;
  const height = canvas.height;
  const numLayers = LAYERS.length;
  const deltaX = (width - (leftPadding + rightPadding)) / (numLayers-1); // vertical space between layers
  let deltaY = []
  for (let i in LAYERS) {
    deltaY.push( Math.min(100, Math.max(30, (canvas.height - topPadding - bottomPadding) / (LAYERS[i]-1))));
  }

  // Calcul de la position des neurones
  let getPos = (i,j) => {
    let x = leftPadding + i*deltaX;
    let y = topPadding + j*deltaY[i];
    return {x : x, y : y};
  }

  // dessiner les liens
  ctx.lineWidth = 1;
  ctx.strokeStryle = 'black';
  ctx.beginPath();
  for (let i=1; i<LAYERS.length; i++) {
    for (let j=0; j<LAYERS[i-1]; j++) {
      for (let k=0; k<LAYERS[i]; k++) {
        let p0 = getPos(i-1,j);
        let p1 = getPos(i,k);
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
    }
  }
  ctx.stroke();

  // dessiner le neurones
  ctx.lineWidth = 4;
  ctx.strokeStryle = 'black';
  ctx.fillStyle = 'white';
  ctx.beginPath();
  for (let i=0; i<LAYERS.length; i++) {
    for (let j=0; j<LAYERS[i]; j++) {
      let p = getPos(i, j);
      ctx.moveTo(p.x + nodeRadius, p.y);
      ctx.arc(p.x, p.y, nodeRadius, 0, 2*Math.PI);
    }
  }
  ctx.fill();
  ctx.stroke();
}


function updateNumberOfParameters() {
  let d = document.getElementById("numberOfParameters");
  if (LAYERS.length == 2) {
    d.innerHTML = "Nombre de paramètres à optimser:  " + (LAYERS[0] * LAYERS[1]) + ".";
  }
  else {
    let x = LAYERS[0] * LAYERS[1];
    let s = "" + x;
    let tot = x;
    for (let i=2; i<LAYERS.length; i++) {
      x = LAYERS[i-1] * LAYERS[i];
      s += " + " + x;
      tot += x;
    }
    d.innerHTML = "Nombre de paramètres à optimser:  " + s + " = " + tot + ".";
  }
}

function updateAll() {
  document.getElementById("numberOfLayers").innerHTML = "" + LAYERS.length;
  for (let i=1; i<MAXNUMLAYERS; i++) {
    if (i < LAYERS.length-1) {
      document.getElementById("hiddenLayerSize" + i).innerHTML = LAYERS[i];
      document.getElementById("numNeuronesHiddenLayer" + i).style.display = '';
    } 
    else {
      document.getElementById("numNeuronesHiddenLayer" + i).style.display = 'none';
    }
  }
  drawNetwork();
  updateNumberOfParameters();
}





/*
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 *
 * Section 3 : Communication avec le serveur
 *
 **********************************************************************************
 **********************************************************************************
 **********************************************************************************
 */

var progressDiv  = document.getElementById("progressDisplay");
var completedDiv = document.getElementById("completedDisplay");
var startButton  = document.getElementById("startButton");
var stopButton   = document.getElementById("stopButton");
var spinWheel    = document.getElementById("spinWheel");
var visualizeButton = document.getElementById("visualizeButton");
visualizeButton.disabled = true;


var websocket = null;
const SERVER = 'localhost:8081'

/**
 * Modèles de message à être envoyés au serveur.
 * Pour les utiliser, on commence par faire une copie et, si nécessaire, on
 * modifie les éléments qui ont besoin de l'être.
 */
const MESSAGES = {
  'startTraining' : {
    'category' : 'startTraining', 
    'datafile' : null, 
    'layers' : null, 
    'labels' : null, 
    'format' : null
  },
  'stopTraining'  : {'category' : 'stopTraining'},
};


function connectToServer() {
  document.getElementById('connectionStatus').innerHTML = 'Non connecté au serveur. Veuillez recharger la page.';
  websocket = new WebSocket('ws://' + SERVER);

  // Ouverture de la connexion
  websocket.addEventListener('open', function (event) {
    document.getElementById('connectionStatus').innerHTML = 'Connecté au serveur.';
    startButton.disabled = false;
  });

  // Fermeture de la connexion
  websocket.addEventListener('close', function (event) {
    startButton.disabled = true;
    startButton.disabled = true;
  });

  ////////////////////////////////
  ///RECEIVING DATA FROM SERVER///
  ////////////////////////////////
  websocket.onmessage = function (event) {
    console.log("Received : " + event.data);
    try {
      let data = JSON.parse(event.data)
      if (data.category == 'initialization') {
        spinWheel.style.display = '';
        completedDiv.innerHTML = "";
        progressDiv.innerHTML = "Initialisation du programme d'entraînement...";
      }
      else if (data.category == 'progress') {
        spinWheel.style.display = '';
        completedDiv.innerHTML = "";
        progressDiv.innerHTML = "Itération #" + (parseInt(data.epoch)+1) + ', efficacité : ' + data.accuracy + ', erreur : ' + data.mse;
      }
      else if (data.category == 'completed') {
        spinWheel.style.display = 'none';
        completedDiv.innerHTML = "Entraînement terminé";
        startButton.disabled = false;
        stopButton.disabled = true;
        visualizeButton.disabled = false;
      }
    } catch (error) {
      console.error(error);
    }
  };

}

connectToServer()

function startTraining() {
  startButton.disabled = true;
  visualizeButton.disabled = true;
  let m = {...MESSAGES.startTraining}; // crée une copie du message
  if (SELECTEDTASK == 1) {
    m.datafile = './data/droites.csv';
    m.format = 'numberList';
    m.labels = 'Oui,Non';
  } 
  else if (SELECTEDTASK == 2) {
    m.datafile = './data/mnist-ubyte';
    m.format = 'binary';
    m.labels = '0,1,2,3,4,5,6,7,8,9';
  }
  m.layers = LAYERS.join(',');
  websocket.send(JSON.stringify(m));
  console.log("Sent : " + JSON.stringify(m));
  progressDiv.innerHTML = "Début de l'entraînement"
  stopButton.disabled = false;
}


function stopTraining() {
  let m = {...MESSAGES.stopTraining}; // crée une copie du message
  console.log("Sending : " + JSON.stringify(m));
  websocket.send(JSON.stringify(m));
}

//data = {flip: {card: elem.id, flipped:card.flipped}};
//websocket.send(JSON.stringify(data));


document.getElementById("task1Button").onclick();

// Gestion des bouton pour activer le thermomètre
document.getElementById("cheatButton2").style.visibility = "hidden";
document.getElementById("cheatButton3").style.visibility = "hidden";
function cheatButton1Pressed() {
  document.getElementById("cheatButton2").style.visibility = "";
}
function cheatButton2Pressed() {
  document.getElementById("cheatButton3").style.visibility = "";
}
function cheatButton3Pressed() {
  document.getElementById("cheatButton1").classList.toggle("clignotant");
  document.getElementById("cheatButton2").classList.toggle("clignotant");
  document.getElementById("cheatButton3").classList.toggle("clignotant");
  document.getElementById("cheatText").style.visibility = "";
  document.getElementById("cheatText").classList.toggle("clignotant");
  thermometres();
}
