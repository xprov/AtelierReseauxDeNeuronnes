/**
 * CHALLENGE NEURAL NETWORK
 *
 * Les défis sont des réseaux de neurones avec une ou plusieurs entrées et la
 * ou les valeurs attendues en sortie.
 * 
 * L'utilisateur utilise des curseurs pour modifier la valeur les points
 * associés aux connexions entre les neurones.
 *
 *
 */


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Parameter {
  constructor(challengeId, minValue, maxValue, defaultValue) {
    this.challengeId = challengeId;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.defaultValue = defaultValue;
    this.label = document.createElement("div");
    this.label.innerHTML = "" + defaultValue;
    this.slider = document.createElement("INPUT");
    this.slider.id = name;
    this.slider.type = "range";
    this.slider.min = this.minValue;
    this.slider.max = this.maxValue;
    this.slider.step = 0.001;
    this.slider.value = this.defaultValue;
    this.slider.style="width: 550px";
    this.slider.setAttribute("challenge", challengeId);
    this.slider.setAttribute("label", this.label);
    this.slider.oninput = function() {Challenge.all[this.getAttribute("challenge")].update()};
  }
}

class Node{

  // L'activation est une valeur entre 0 et 100.

  constructor(x, y, activation)
  {
    this.x = x;
    this.y = y;
    this.activation = activation;
  }

}


class Challenge {

  // Dictionnaire contenant tous les challenges. Les clés sont les `challengeId`.
  static all = {};
  static lastAdded = null;

  /**
   * Le `challengeId` doit correcpondre au `id` du DIV dans lequel le challenge est inséré.
   */
  constructor(challengeId) {
    // Devraient être initialisés par le constructeur de la classe enfant.
    this.challengeId   = challengeId;
    this.nodes        = [];
    this.parameters    = {};
    this.minError      = null;
    this.adhocErrorFactor = 1;
    this.isActivated = false;
    this.isSolved = false;
    this.gradientStep = 0.001;

    // Ajoute le challenge à la liste de tous les challenges
    // De plus, les challenges forment une liste chaînée via l'attribut
    // `nextChallenge`.
    Challenge.all[challengeId] = this;
    if (Challenge.lastAdded != null) {
      Challenge.lastAdded.nextChallenge = this;
    }
    Challenge.lastAdded = this;
    this.nextChallenge = null;

    // Le canvas est la zone où la courbe et les points sont dessinés.
    this.canvas = document.createElement("CANVAS");
    this.canvas.style.border = "2px solid black";

    // Valeur par défaut, peuvent être modifiées par le constructeur de la classe enfant
    this.canvas.width = 650;
    this.canvas.height = 300;
    this.xmin = -1;  // On veut garder un offset horizontal équivalent à une unité à gauche et à droite du premier/dernier neurone.
    this.xmax = 18;  // L'intervalle horizontal est donc de 12 + 2 unités de offset plus 5 autres unités pour afficher l'objectif.
    this.ymin = -5; // Même chose, mais pour une plage verticale de longueur 8, centrée en 0.
    this.ymax = 5;
    this.nodeRadius = 20;
    this.defaultLineWidth = 3;

    // Construction du thermomètre
    this.thermometer = document.createElement("CANVAS");
    this.thermometer.className = "thermometre";
    this.thermometer.style.border = "0px;";
    this.thermometer.style.visibility = 'hidden';
    this.thermometer.width = 100;
    this.thermometer.height = 300;

    this.grosseTriche = 1;
  }


  /**
   * Ajoute le défi dans le document HTML
   */
  addToDocument() {
    let div, table, col, line;

    div = document.getElementById(this.challengeId);
    table = document.createElement("table");
    line = document.createElement("tr");
    col = document.createElement("td");
    col.appendChild(this.canvas);
    line.appendChild(col)
    col = document.createElement("td");
    col.appendChild(this.thermometer);
    line.appendChild(col)
    table.appendChild(line);
    div.appendChild(table);

    table = document.createElement("table");
    for (var i in this.parameters) {
      var p = this.parameters[i];
      line = document.createElement("tr");

      // 1ere colonne : le nom du paramètre
      col = document.createElement("td");
      col.innerHTML = i;
      line.appendChild(col);

      // 2e colonne : le slider
      col = document.createElement("td");
      col.appendChild(p.slider);
      line.appendChild(col);

      //3e colonne : le slider
      col = document.createElement("td");
      col.appendChild(p.label);
      line.appendChild(col);

      line.appendChild(col);
      table.appendChild(line);
    }
    div.appendChild(table);
    document.getElementById(this.challengeId + "s").innerHTML = "<button class='defiReussi'>Défi réussi !!!</button>";
    document.getElementById(this.challengeId + "s").style.visibility = "hidden";

  }


  /**
   * Converti une coordonnée x pour qu'elle corresponde au système de coordonnées du canvas
   */
  convertX(x) {
    return (x - this.xmin) * this.canvas.width / (this.xmax - this.xmin);
  }

  /**
   * Converti une coordonnée y pour qu'elle corresponde au système de coordonnées du canvas
   */
  convertY(y) {
    return this.canvas.height *(1.0 -  ((y - this.ymin) / (this.ymax - this.ymin)));
  }

  componentToHex(c)
  {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }


  rgbToHex(r, g, b)
  {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);

  }

  // Value est une valeur de gris entre 0 et 100, pour laquelle on recevra le code hex
  getGray(value)
  {
    let v = Math.trunc(255 * value / 100);
    return this.rgbToHex(v, v, v);
  }

  /**
   * Effectue la mise à jour du défi.
   * Entre autre, cette fonction est appelée à chaque que les paramètres sont modifiés.
   */
  update() {
    if (this.isActivated) {
      // mise à jour des labels des paramètres
      for (let i in this.parameters) {
        let p = this.parameters[i];
        p.label.innerHTML = p.slider.value;
      }
      this.drawSelf();
      this.drawThermometer();
      this.validate();
    }
    else {
      let ctx = this.canvas.getContext("2d");
      ctx.fillStyle = 'lightgray';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fill();
    }
  }

  /**
   * Dessine le réseau de neurones avec les poids par défaut dans le canvas.
   * 
   * Old, c'est devenu un fonction virtuelle qui doit absolument être définie par
   * les classes enfants.
   */
  drawSelf() 
  {
    throw new Error('Cette fonction doit être redéfinie dans la classe enfant');
  }



  /**
   * Calcule l'erreur. En général, il s'agit de l'erreur quadratique moyenne,
   * mais cela dépent du défi.
   *
   * C'est pourquoi cette fonction doit obligatoirement être redéfinie dans la
   * classe enfant.
   */
  computeError() {
    throw new Error('Cette fonction doit être redéfinie dans la classe enfant');
  }


  /**
   * Teste si le défi est complété. Si c'est le cas, on affiche qu'il est
   * complété et on débloque le défi suivant.
   */
  validate() {
    let error = this.computeError();
    if (error < this.minError) {
      document.getElementById(this.challengeId + "s").style.visibility = "";
    }
    else {
      document.getElementById(this.challengeId + "s").style.visibility = "hidden";
    }
    if (error < this.minError && !this.isSolved) {
      this.isSolved = true;
      if (this.nextChallenge != null) {
        this.nextChallenge.activate();
      }
    } 
    else {
      //console.log("echec : " + error);
    }
  }

  /**
   * Active le défi. Le joueur peut maintenant tenter de le résoudre.
   */
  activate() {
    this.isActivated = true;
    for (var i in this.parameters) {
      this.parameters[i].slider.disabled = false;
    }
    this.update();
  }

  /**
   * Retourne la valeur du paramètre spécifié
   */
  parameterValue(name) {
    return parseFloat(this.parameters[name].slider.value);
  }

  drawThermometer() {
    let ctx = this.thermometer.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    var topLeft = {x : 40, y : 20};
    var width = 20;
    var height = 260;

    var error = Math.min(1.0, this.computeError());
    let blue = 255 - Math.trunc(255 * Math.pow(error, 1));
    let red = Math.trunc(255 * Math.pow(error, 1));
    let mercury = Math.min(height, Math.trunc(Math.pow(error, 0.5) * height)); // hauteur du mercure dans le thermomètre

    // Dessiner le mercure
    ctx.beginPath();
    ctx.fillStyle = this.rgbToHex(red, 0, blue);
    ctx.rect(topLeft.x, topLeft.y + (height - mercury), width, mercury)
    ctx.fill();

    // Dessiner le contour
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.rect(topLeft.x, topLeft.y, width, height);
    ctx.stroke();
  }

  gradientDescentOneIteration() {
    let epsilon = 0.001;

    // On parcourt les paramètres en ordre inverse pour genre simuler
    // `back-propagation`.
    let params = Object.keys(this.parameters);
    params.sort().reverse();

    let errorBefore = this.computeError()

    for (let i in params) {
      let p = this.parameters[params[i]];
      let x = parseFloat(p.slider.value);
      let e0 = this.computeError()
      p.slider.value = x + epsilon;
      this.propagate();
      let e1 = this.computeError()
      p.slider.value = x - epsilon;
      let delta = e1 - e0;
      if (delta > 0) {
        p.slider.value = x - this.gradientStep;
      } 
      else {
        p.slider.value = x + this.gradientStep;
      }

      console.log("" + params[i] + " = " + x + " -> " + p.slider.value + ", delta = " + delta + ", D_err=" + (this.computeError() - e0));
    }

    let errorAfter = this.computeError()
    if (errorAfter >= errorBefore) {
      console.log('diminution du step')
      this.gradientStep = this.gradientStep / 1.1;
      this.grosseTriche = this.grosseTriche / 2;
      //throw new Error("L'erreur augmente!");
    }

  }

  async gradientDescent(nbIterMax, refreshRate, timeout) {
    for (let i=0; i<nbIterMax; i++) {
      this.gradientDescentOneIteration();
      if (i % refreshRate == 0) {
        this.update();
        if (this.isSolved) {
          return;
        }
        if (timeout > 1) {
          await sleep(timeout);
        }
      }
    }
  }

  async autoSolve() {
    await this.gradientDescent(10000, 1, 10);
  }
}




/**
 * CHALLENGE #1
 *
 * Un réseau à deux couches, avec un neurone en entrée, un en sortie.
 *
 */
class ChallengeNN1 extends Challenge {


  constructor(challengeId) {
    super(challengeId); // ligne obligatoire


    /**
     *
     * On va regrouper ici toutes les définitions des
     * valeurs hard codées nécessaires
     * pour réaliser ce challenge.
     *
     */

    this.minError = 0.0001;
    this.adhocErrorFactor = 0.0001686625;

    // Nombre de neurones dans ce réseau
    this.NUM_NODES  = 3;

    // Coordonnées des neurones
    this.NODE1_X = 1;
    this.NODE1_Y = 0;

    this.NODE2_X = 11;
    this.NODE2_Y = 0;

    // Coordonnées des neurones qui affichent la sortie demandée
    this.EXP_NODE1_X = 16;
    this.EXP_NODE1_Y = 0;

    // Activations initiales (entre 0 et 100)
    this.NODE1_DEF_ACT = 100;
    this.NODE2_DEF_ACT = 22;

    // Activations recherchées
    this.EXP_NODE1_ACT = 77


    // Construction du réseau de neurones


    // Avec toute l'élégance du monde, entrons les coordonnées des neurones.
    this.nodes.push(new Node(this.NODE1_X, this.NODE1_Y, this.NODE1_DEF_ACT));  
    this.nodes.push(new Node(this.NODE2_X, this.NODE2_Y, this.NODE2_DEF_ACT)); 

    // On n'oublie pas le neurone attendu
    this.nodes.push(new Node(this.EXP_NODE1_X, this.EXP_NODE1_Y, this.EXP_NODE1_ACT)); 


    // Construction des paramètres
    //
    // Pour ce challenge, il n'y a qu'un seul paramètre, soit le poids de l'unique arête.
    this.parameters["a"] = new Parameter(challengeId, 0, 1, 0.5);

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Évaluation de l'activation de chacun des neurones, à partir des valeur en entré.
   */
  propagate() {
    this.nodes[1].activation = this.parameterValue('a') * this.nodes[0].activation;
  }

  /**
   * Dessine l'état actuel du défi. 
   */

  drawSelf() 
  {

    let ctx = this.canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    // On récupère la valeur du poids
    let w = this.parameterValue("a");	

    // On dessine d'abord les arêtes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, w*10);
    ctx.beginPath();

    let X0 = this.convertX(this.nodes[0].x);
    let Y0 = this.convertY(this.nodes[0].y);

    let X1 = this.convertX(this.nodes[1].x);		
    let Y1 = this.convertY(this.nodes[1].y);

    ctx.moveTo(X0, Y0);
    ctx.lineTo(X1, Y1);
    ctx.stroke();	

    // Maintenant, on dessine les neurones
    // On commence par mettre à jour l'activation du neurone de sortie
    this.nodes[1].activation = w * this.nodes[0].activation;	

    ctx.lineWidth = this.defaultLineWidth;

    for(let i = 0; i < this.NUM_NODES; i++)
    {
      let X = this.convertX(this.nodes[i].x);
      let Y = this.convertY(this.nodes[i].y);

      ctx.beginPath();

      ctx.fillStyle = this.getGray(this.nodes[i].activation);
      ctx.arc(X, Y, this.nodeRadius, 0, 2*Math.PI, false);

      ctx.fill();
      ctx.stroke();
    }	

    // Finalement, on dessine la zone de sortie attendue
    ctx.fillStyle = this.getGray(75);
    ctx.lineWidth = 2; 
    ctx.moveTo(this.convertX(13.5), this.convertY(-4));
    ctx.lineTo(this.convertX(13.5), this.convertY(4));
    ctx.stroke();

    ctx.fillStyle = "blue";
    ctx.font = "30px Arial";
    ctx.fillText("Objectif", this.convertX(14.2), this.convertY(4));
    ctx.fillStyle = "black";
    ctx.font = "20px";
    ctx.fillText("a", this.convertX(6), this.convertY(0.6));
  }

  /**
   * Calcule l'erreur (normalisée entre 0 et 1) entre la sortie obtenue et
   * celle désirée
   */
  computeError() {
    let err = this.nodes[1].activation - this.nodes[2].activation; 
    let mse = err*err;
    return mse * this.adhocErrorFactor * this.grosseTriche;
  }


}
















/**
 * CHALLENGE #2
 *
 * Un réseau à deux couches, avec deux neurones en entrée, deux en sortie.
 *
 */
class ChallengeNN2 extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire


    /**
     *
     * On va regrouper ici toutes les définitions des
     * valeurs hard codées nécessaires
     * pour réaliser ce challenge.
     *
     */

    this.minError = 0.002;
    this.adhocErrorFactor = 1/5000;

    // Nombre de neurones dans ce réseau (incluant la sortie désirée)
    this.NUM_NODES  = 6;

    // Coordonnées des neurones
    // Première couche: 1,2
    // Seconde couche: 3,4

    this.NODE1_X = 1;
    this.NODE1_Y = -3;

    this.NODE2_X = 1;
    this.NODE2_Y = 3;


    this.NODE3_X = 11;
    this.NODE3_Y = -3;

    this.NODE4_X = 11;
    this.NODE4_Y = 3;


    // Coordonnées des neurones qui affichent la sortie demandée
    this.EXP_NODE1_X = 16;
    this.EXP_NODE1_Y = -3;

    this.EXP_NODE2_X = 16;
    this.EXP_NODE2_Y = 3;


    // Activations initiales (entre 0 et 100)
    this.NODE1_DEF_ACT = 83;
    this.NODE2_DEF_ACT = 22;
    this.NODE3_DEF_ACT = 41;
    this.NODE4_DEF_ACT = 30;


    // Activations recherchées
    this.EXP_NODE1_ACT = 43
    this.EXP_NODE2_ACT = 26 

    // Construction du réseau de neurones


    // Avec toute l'élégance du monde, entrons les coordonnées des neurones.
    this.nodes.push(new Node(this.NODE1_X, this.NODE1_Y, this.NODE1_DEF_ACT));  
    this.nodes.push(new Node(this.NODE2_X, this.NODE2_Y, this.NODE2_DEF_ACT)); 
    this.nodes.push(new Node(this.NODE3_X, this.NODE3_Y, this.NODE3_DEF_ACT));  
    this.nodes.push(new Node(this.NODE4_X, this.NODE4_Y, this.NODE4_DEF_ACT)); 

    // On n'oublie pas les neurones attendus
    this.nodes.push(new Node(this.EXP_NODE1_X, this.EXP_NODE1_Y, this.EXP_NODE1_ACT)); 
    this.nodes.push(new Node(this.EXP_NODE2_X, this.EXP_NODE2_Y, this.EXP_NODE2_ACT)); 

    // Construction des paramètres
    //
    // Pour ce challenge, il y a 4 paramètres.
    this.parameters["a"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["b"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["c"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["d"] = new Parameter(challengeId, 0, 1, 0.5);

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }


  propagate() {
    let a = this.parameterValue("a");	
    let b = this.parameterValue("b");	
    let c = this.parameterValue("c");	
    let d = this.parameterValue("d");	
    this.nodes[2].activation = Math.max(0, Math.min(100, d * this.nodes[0].activation + b * this.nodes[1].activation));
    this.nodes[3].activation = Math.max(0, Math.min(100, c * this.nodes[0].activation + a * this.nodes[1].activation));
  }



  /**
   * Dessine l'état actuel du défi. 
   */

  drawSelf() 
  {

    let ctx = this.canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    // On récupère la valeur du poids
    let a = this.parameterValue("a");	
    let b = this.parameterValue("b");	
    let c = this.parameterValue("c");	
    let d = this.parameterValue("d");	

    let weights = [];
    weights.push(d);
    weights.push(b);
    weights.push(c);
    weights.push(a);


    // On dessine d'abord les arêtes


    ctx.strokeStyle = '#000000';


    // Ici, i seront les neurones de la couche d'entrée
    // et j ceux de la couche de sortie
    for(let i = 0; i < 2; i++)
    {
      for(let j=0; j < 2; j++)
      {
        ctx.lineWidth = Math.max(1, weights[2*j + i]*10);
        ctx.beginPath();


        let X0 = this.convertX(this.nodes[i].x);
        let Y0 = this.convertY(this.nodes[i].y);

        let X1 = this.convertX(this.nodes[j+2].x);		
        let Y1 = this.convertY(this.nodes[j+2].y);

        ctx.moveTo(X0, Y0);
        ctx.lineTo(X1, Y1);
        ctx.stroke();		
      }
    }

    // On va maintenant mettre à jour les activations de la couche de sortie
    this.nodes[2].activation = Math.min(100, d * this.nodes[0].activation + b * this.nodes[1].activation);
    this.nodes[3].activation = Math.min(100, c * this.nodes[0].activation + a * this.nodes[1].activation);

    // Nous sommes prêts à dessiner les neurones
    ctx.lineWidth = this.defaultLineWidth;

    for(let i = 0; i < this.NUM_NODES; i++)
    {
      let X = this.convertX(this.nodes[i].x);
      let Y = this.convertY(this.nodes[i].y);

      ctx.beginPath();

      ctx.fillStyle = this.getGray(this.nodes[i].activation);
      ctx.arc(X, Y, this.nodeRadius, 0, 2*Math.PI, false);

      ctx.fill();
      ctx.stroke();
    }	

    // Finalement, on dessine la zone de sortie attendue et les labels

    ctx.fillStyle = this.getGray(75);
    ctx.lineWidth = 2; 
    ctx.moveTo(this.convertX(13.5), this.convertY(-4));
    ctx.lineTo(this.convertX(13.5), this.convertY(4));
    ctx.stroke();

    ctx.fillStyle = "blue";
    ctx.font = "30px Arial";
    ctx.fillText("Objectif", this.convertX(14.2), this.convertY(4));
    ctx.fillStyle = "black";
    ctx.font = "20px";
    ctx.fillText("a", this.convertX(6), this.convertY(3.4));
    ctx.fillText("b", this.convertX(3), this.convertY(0.5));
    ctx.fillText("c", this.convertX(3), this.convertY(-1.0));
    ctx.fillText("d", this.convertX(6), this.convertY(-4.2));

  }

  /**
   * Calcule l'erreur (normalisée entre 0 et 1) entre la sortie obtenue et celle désirée
   */
  computeError() {
    let err1 = this.nodes[2].activation - this.nodes[4].activation; 
    let err2 = this.nodes[3].activation - this.nodes[5].activation; 
    let mse = (err1*err1 + err2*err2) / 2;
    //console.log(mse);
    console.log(mse * this.adhocErrorFactor * this.grosseTriche);
    return mse * this.adhocErrorFactor * this.grosseTriche;
  }



}











/**
 * CHALLENGE #3
 *
 * Un réseau à trois couches, avec 2 neurones sur chaque couche, trois entrées
 * différentes et trois sorties attentues.
 */
class ChallengeNN3 extends Challenge {
  constructor(challengeId) {
    super(challengeId); // ligne obligatoire
    this.canvas.width = 950;
    this.canvas.height = 600;
    this.xmin = -1; 
    this.xmax = 28;  
    this.ymax = 44;
    this.ymin = -3;
    this.nodeRadius = 15;
    this.minError = 0.0001;
    this.adhocErrorFactor = 1 / 3000;



    // Se lit de bas en haut...
    let inputs     = [100,   0, 100, 100,   0, 100];
    let objectives = [ 35,  93,  45, 100,  14,  90];



    /**
     * On va regrouper ici toutes les définitions des valeurs hard codées
     * nécessaires pour réaliser ce challenge.
     */


    // Nombre de neurones dans ce réseau (incluant la sortie désirée)
    this.NUM_NODES  = 24;

    /**
     * Disposition des nodes... c'est un maudit bordel.
     * Toujours passer par this.getNode(`# copie`, `# layer`, `hauteur dans layer`)
     *
     *                       i
     *        ------------------------------
     * 
     *  |  j| (2,0,1)     (2,1,1)     (2,2,1) 
     *  |   | (2,0,0)     (2,1,0)     (2,2,0) 
     *  |
     *  |     (0,0,1)     (0,1,1)     (0,2,1) 
     * k|     (0,0,0)     (0,1,0)     (0,2,0) 
     *  |
     *  |     (0,0,1)     (0,1,1)     (0,2,1) 
     *  |     (0,0,0)     (0,1,0)     (0,2,0) 
     *
     */
    this['getNode'] = (k,i,j) => this.nodes[6*k + 2*i + j];
    this['getExpNode'] = (i) => this.nodes[this.nodes.length - 6 + i];
    let dx = 10;
    let dy = 6;
    let ddy = 15;
    for (let k=0; k<3; k++) { // k est le numéro de la copie du réseau
      for (let i=0; i<3; i++) { // i est le numéro de layer
        for (let j=0; j<2; j++) { // j est la hauteur dans un layer
          this.nodes.push(new Node(1+i*dx, k*ddy + j*dy, 0));
        }
      }
    }

    // Un connexion est un triple (n1, n2, p) où 
    // n1 et n2 sont deux neurones et p est la l'identifiant du paramètre
    // associé à la connexion entre ces deux neurones.
    this['connexions'] = []
    for (let k=0; k<3; k++) { // k est le numéro de la copie du réseau
      this['connexions'].push(...[
        [this.getNode(k, 0, 0), this.getNode(k, 1, 0), 'd'],
        [this.getNode(k, 0, 0), this.getNode(k, 1, 1), 'c'],
        [this.getNode(k, 0, 1), this.getNode(k, 1, 0), 'b'],
        [this.getNode(k, 0, 1), this.getNode(k, 1, 1), 'a'],
        [this.getNode(k, 1, 0), this.getNode(k, 2, 0), 'h'],
        [this.getNode(k, 1, 0), this.getNode(k, 2, 1), 'g'],
        [this.getNode(k, 1, 1), this.getNode(k, 2, 0), 'f'],
        [this.getNode(k, 1, 1), this.getNode(k, 2, 1), 'e'],
      ]);
    }

    // Valeurs en entrée
    this.getNode(0, 0, 0).activation = inputs[0];
    this.getNode(0, 0, 1).activation = inputs[1];
    this.getNode(1, 0, 0).activation = inputs[2];
    this.getNode(1, 0, 1).activation = inputs[3];
    this.getNode(2, 0, 0).activation = inputs[4];
    this.getNode(2, 0, 1).activation = inputs[5];


    // Activations recherchées
    for (let k=0; k<3; ++k) {
      for (let i=0; i<2; ++i) {
        this.nodes.push(new Node(2.6*dx, k*ddy+i*dy, objectives[2*k+i]));
      }
    }

    // Construction du réseau de neurones


    // Construction des paramètres
    //
    // Pour ce challenge, il y a 6 paramètres.
    this.parameters["a"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["b"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["c"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["d"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["e"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["f"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["g"] = new Parameter(challengeId,  0, 1, 0.5);
    this.parameters["h"] = new Parameter(challengeId,  0, 1, 0.5);


    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Évaluation de l'activation de chacun des neurones, à partir des valeur en entré.
   */
  propagate() {
    // Tous les neurones qui ne sont pas dans la couche d'entrée sont mis à 0.
    for (let k=0; k<3; k++) { // k est le numéro de la copie du réseau
      for (let i=1; i<3; i++) { // i est le numéro de layer
        for (let j=0; j<2; j++) { // j est la hauteur dans un layer
          this.getNode(k, i, j).activation = 0;
        }
      }
    }

    // Chaque connexion ajoute une valeur à l'activation du neuronne de droite.
    for (let i in this.connexions) {
      let c = this.connexions[i];
      let n0 = c[0];
      let n1 = c[1];
      let w  = this.parameterValue(c[2]);
      n1.activation = Math.max(0, Math.min(100, n1.activation + w*n0.activation));
    }
  }

  /**
   * Dessine l'état actuel du défi. 
   */
  drawSelf() {
    // Calculer les valeurs de neurones
    this.propagate();

    let ctx = this.canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    // On dessine d'abord les arêtes en noir et d'une épaisseur qui dépend de
    // la valeur du paramètre.
    ctx.strokeStyle = '#000000';
    for (let i in this.connexions) {
      let c = this.connexions[i];
      let n0 = c[0];
      let n1 = c[1];
      let w  = this.parameterValue(c[2]);
      ctx.lineWidth = Math.max(1, 10*w);
      ctx.beginPath();
      let X0 = this.convertX(n0.x);
      let Y0 = this.convertY(n0.y);
      let X1 = this.convertX(n1.x);
      let Y1 = this.convertY(n1.y);

      ctx.moveTo(X0, Y0);
      ctx.lineTo(X1, Y1);
      ctx.stroke();		
    }

    // Tracer toutes les neurones
    for(let i = 0; i < this.NUM_NODES; i++) {
      let n = this.nodes[i];

      let X = this.convertX(n.x);
      let Y = this.convertY(n.y);

      ctx.lineWidth = this.defaultLineWidth;
      ctx.beginPath();
      ctx.fillStyle = this.getGray(this.nodes[i].activation);
      ctx.arc(X, Y, this.nodeRadius, 0, 2*Math.PI, false);
      ctx.fill();
      ctx.stroke();
    }	

    // Finalement, on dessine la zone de sortie attendue et les labels
    ctx.fillStyle = this.getGray(75);
    ctx.lineWidth = 2; 
    let x = (this.getNode(0,2,0).x + this.getExpNode(0).x) / 2;
    ctx.moveTo(this.convertX(x), this.convertY(-2));
    ctx.lineTo(this.convertX(x), this.convertY(40));

    ctx.fillStyle = "blue";
    ctx.font = "30px Arial";
    ctx.fillText("Objectifs", this.convertX(24), this.convertY(41));

    ctx.stroke();
  }

  /**
   * Calcule l'erreur (normalisée entre 0 et 100) entre la sortie obtenue et celle désirée
   */
  computeError() {


    // Au maximum, la sortie attendue et celle obtenue peuvent différer de 100. (node wise)
    //

    let mse = 0.0;
    for (let k=0; k<3; k++) {
      for (let j=0; j<2; j++) {
        let n = this.getNode(k, 2, j);
        let m = this.getExpNode(2*k-j);
        let e = this.getNode(k, 2, j).activation - this.getExpNode(2*k+j).activation;
        mse += e*e;
      }
    }
    mse = mse / 6;
    //console.log(mse);
    return mse * this.adhocErrorFactor * this.grosseTriche;
  }


}















/**
 * CHALLENGE #4 (en fait c'est l'ancien #3)
 *
 * Un réseau à deux couches, avec 3 neurones en entrée, deux en sortie.
 *
 */
class ChallengeNN4 extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire


    /**
     *
     * On va regrouper ici toutes les définitions des
     * valeurs hard codées nécessaires
     * pour réaliser ce challenge.
     *
     */

    this.minError = 0.002;
    this.adhocErrorFactor = 1/4500;

    // Nombre de neurones dans ce réseau (incluant la sortie désirée)
    this.NUM_NODES  = 7;

    // Coordonnées des neurones
    // Première couche: 0,1,2
    // Seconde couche: 3,4

    this.NODE0_X = 1;
    this.NODE0_Y = -3;

    this.NODE1_X = 1;
    this.NODE1_Y = 0;

    this.NODE2_X = 1;
    this.NODE2_Y = 3;


    this.NODE3_X = 11;
    this.NODE3_Y = -1.5;

    this.NODE4_X = 11;
    this.NODE4_Y = 1.5;


    // Coordonnées des neurones qui affichent la sortie demandée
    this.EXP_NODE1_X = 16;
    this.EXP_NODE1_Y = -1.5;

    this.EXP_NODE2_X = 16;
    this.EXP_NODE2_Y = 1.5;


    // Activations initiales (entre 0 et 100)
    this.NODE0_DEF_ACT = 12;
    this.NODE1_DEF_ACT = 83;
    this.NODE2_DEF_ACT = 22;
    this.NODE3_DEF_ACT = 41;
    this.NODE4_DEF_ACT = 30;


    // Activations recherchées
    this.EXP_NODE1_ACT = 43
    this.EXP_NODE2_ACT = 26 

    // Construction du réseau de neurones


    // Avec toute l'élégance du monde, entrons les coordonnées des neurones.
    this.nodes.push(new Node(this.NODE0_X, this.NODE0_Y, this.NODE0_DEF_ACT)); 
    this.nodes.push(new Node(this.NODE1_X, this.NODE1_Y, this.NODE1_DEF_ACT));  
    this.nodes.push(new Node(this.NODE2_X, this.NODE2_Y, this.NODE2_DEF_ACT)); 
    this.nodes.push(new Node(this.NODE3_X, this.NODE3_Y, this.NODE3_DEF_ACT));  
    this.nodes.push(new Node(this.NODE4_X, this.NODE4_Y, this.NODE4_DEF_ACT)); 

    // On n'oublie pas les neurones attendus
    this.nodes.push(new Node(this.EXP_NODE1_X, this.EXP_NODE1_Y, this.EXP_NODE1_ACT)); 
    this.nodes.push(new Node(this.EXP_NODE2_X, this.EXP_NODE2_Y, this.EXP_NODE2_ACT)); 

    // Construction des paramètres
    //
    // Pour ce challenge, il y a 6 paramètres.
    this.parameters["a"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["b"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["c"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["d"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["e"] = new Parameter(challengeId, 0, 1, 0.5);
    this.parameters["f"] = new Parameter(challengeId, 0, 1, 0.5);

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Dessine l'état actuel du défi. 
   */

  drawSelf() 
  {

    let ctx = this.canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    // On récupère la valeur du poids
    let a = this.parameterValue("a");	
    let b = this.parameterValue("b");	
    let c = this.parameterValue("c");	
    let d = this.parameterValue("d");	
    let e = this.parameterValue("e");	
    let f = this.parameterValue("f");	

    let weights = [];
    weights.push(a);
    weights.push(b);
    weights.push(c);
    weights.push(d);
    weights.push(e);
    weights.push(f);


    // On dessine d'abord les arêtes


    ctx.strokeStyle = '#000000';


    // Ici, i seront les neurones de la couche d'entrée
    // et j ceux de la couche de sortie
    for(let i = 0; i < 3; i++)
    {
      for(let j=0; j < 2; j++)
      {

        ctx.lineWidth = Math.max(1,weights[3*j + i]*10);
        ctx.beginPath();


        let X0 = this.convertX(this.nodes[i].x);
        let Y0 = this.convertY(this.nodes[i].y);

        let X1 = this.convertX(this.nodes[j+3].x);		
        let Y1 = this.convertY(this.nodes[j+3].y);

        ctx.moveTo(X0, Y0);
        ctx.lineTo(X1, Y1);
        ctx.stroke();		
      }
    }

    // On va maintenant mettre à jour les activations de la couche de sortie
    this.nodes[3].activation = Math.min(100, a * this.nodes[0].activation + b * this.nodes[1].activation + c * this.nodes[2].activation);
    this.nodes[4].activation = Math.min(100, d * this.nodes[0].activation + e * this.nodes[1].activation + f * this.nodes[2].activation);

    // Nous sommes prêts à dessiner les neurones
    ctx.lineWidth = this.defaultLineWidth;

    for(let i = 0; i < this.NUM_NODES; i++)
    {
      let X = this.convertX(this.nodes[i].x);
      let Y = this.convertY(this.nodes[i].y);

      ctx.beginPath();

      ctx.fillStyle = this.getGray(this.nodes[i].activation);
      ctx.arc(X, Y, this.nodeRadius, 0, 2*Math.PI, false);

      ctx.fill();
      ctx.stroke();
    }	

    // Finalement, on dessine la zone de sortie attendue et les labels

    ctx.fillStyle = this.getGray(75);
    ctx.lineWidth = 2; 
    ctx.moveTo(this.convertX(13.5), this.convertY(-4));
    ctx.lineTo(this.convertX(13.5), this.convertY(4));

    ctx.fillStyle = "blue";
    ctx.font = "30px Arial";
    ctx.fillText("Objectif", this.convertX(14.2), this.convertY(4));



    //ctx.fillText("w", this.convertX(6), this.convertY(0.6));
    ctx.stroke();
  }


  propagate() {
    let a = this.parameterValue("a");	
    let b = this.parameterValue("b");	
    let c = this.parameterValue("c");	
    let d = this.parameterValue("d");	
    let e = this.parameterValue("e");	
    let f = this.parameterValue("f");	
    this.nodes[3].activation = a * this.nodes[0].activation + b * this.nodes[1].activation + c * this.nodes[2].activation;
    this.nodes[4].activation = d * this.nodes[0].activation + e * this.nodes[1].activation + f * this.nodes[2].activation;
  }

  /**
   * Calcule l'erreur (normalisée entre 0 et 100) entre la sortie obtenue et celle désirée
   */
  computeError() {


    // Au maximum, la sortie attendue et celle obtenue peuvent différer de 100. (node wise)
    //

    let err1 = this.nodes[2].activation - this.nodes[4].activation; 
    let err2 = this.nodes[3].activation - this.nodes[5].activation; 
    let mse = (err1 * err1 + err2 * err2) / 2;
    console.log(mse * this.adhocErrorFactor * this.grosseTriche);
    return mse * this.adhocErrorFactor * this.grosseTriche;
  }

}

// Fonctions pour cacher ou afficher les thermomètres
function hideThermometers() {
  for (let i in Challenge.all) {
    Challenge.all[i].thermometer.style.visibility = 'hidden';
  }
}
function thermometres() {
  for (let i in Challenge.all) {
    Challenge.all[i].thermometer.style.visibility = '';
  }
}


// Construction des défis
var c1 = new ChallengeNN1("challenge1");
var c2 = new ChallengeNN2("challenge2");
var c3 = new ChallengeNN4("challenge3");
var c4 = new ChallengeNN3("challenge4");

// Activation du premier défi
Challenge.all['challenge1'].activate();
Challenge.all['challenge2'].activate();
Challenge.all['challenge3'].activate();
Challenge.all['challenge4'].activate();


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
  sessionStorage.setItem("status", "1");
  thermometres();
}

// Gestion de la face surprise
const face = document.getElementById("face");
let countDown = 12;
let bliking = true;
face.addEventListener("click", () => {
  face.classList.toggle("surprised");
  // reset after 0.2 second
  setTimeout(() => {
    face.classList.toggle("surprised");
  }, 300);
  countDown--;
  if (countDown <= 10 && bliking) {
    document.getElementById("cheatText").classList.toggle("clignotant");
    bliking = false;
  }
  if (countDown <= 7) {
    document.getElementById('cheatText2').innerHTML = `Cliquez encore ${countDown} fois pour activer la solution automatique !`;
  }
  if (countDown <= 0) {
    document.getElementById('cheatText2').innerHTML = 'Mode <b>Solution Automatique</b> activé !<br> Retour à <button class=\"mission\" onclick=\"window.location.href=\'mission1.html\'\">Mission 1</button>';
    sessionStorage.setItem("status", "2");
  }


});

// Gestion du status
let status = sessionStorage.getItem('status');
if (status === null) {
  sessionStorage.setItem('status', '0');
}
status = parseInt(sessionStorage.getItem('status'));
if (status >= 1) {
  thermometres();
}
if (status >= 2) {
  ajouterBoutonsAutoSolve();
}

