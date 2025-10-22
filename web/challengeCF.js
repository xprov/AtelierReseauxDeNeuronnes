/**
 * CHALLENGE CURVE FITTING 
 *
 * Un défi est formé de :
 *
 *  un nuage de points
 *  une courbe
 *  des paramètres
 *  une fonction de calcul d'erreur
 *  un seuil minimum d'erreur
 *
 * Dans un zone d'affichage, on affiche les points et la courbe. Un slider est
 * affiché pour chaque paramètre permettant à l'utilisateur de modifier la
 * valeur de chacun des paramètres. Lorsque l'erreur est inférieure au seuil
 * minimum, le défi est condidéré comme étant réussi.
 *
 * @GRF: test
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
    this.slider.style="width: 700px";
    this.slider.disabled=true;
    this.slider.setAttribute("challenge", challengeId);
    this.slider.setAttribute("label", this.label);
    this.slider.oninput = function() {Challenge.all[this.getAttribute("challenge")].update()};
  }
}

class Challenge {

  // Dictionnaire contenant tous les challenges. Les clés sont les `challengeId`.
  static all = {};
  static lastAdded = null;

  /**
   * Le `challengeId` doit correcpondre au `id` du DIV dans lequel le challenge est inséré.
   */
  constructor(challengeId, points, parameters, errorFunction, minError) {
    // Devraient être initialisés par le constructeur de la classe enfant.
    this.challengeId   = challengeId;
    this.points        = [];
    this.numPoints     = 0;
    this.numCurvePoints = 100;
    this.parameters    = {};
    this.minError      = null;
    this.adhocErrorFactor = 1;
    this.isActivated = false;
    this.isSolved = false;

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
    this.canvas.width = 800;
    this.canvas.height = 500;
    this.xmin = -10;
    this.xmax = 10;
    this.ymin = -3;
    this.ymax = 7;
    this.dotRadius = 3;

    // Bouton indiquant que le défi est réussi
    this.buttonSolved = document.createElement("button");
    this.buttonSolved.className = "defiReussi";
    this.buttonSolved.innerHTML = "Défi réussi !!!";
    this.buttonSolved.style.visibility = "hidden";

    // Bouton pour lancer la solution automatique
    this.buttonAutoSolve = document.createElement("button");
    this.buttonAutoSolve.className = "reset";
    this.buttonAutoSolve.innerHTML = "Solution <br> Automatique";
    this.buttonAutoSolve.style.visibility = "hidden";
    this.buttonAutoSolve.onclick = async function() {
      await Challenge.all[challengeId].autoSolve();
    }


    // Bouton pour débloquer les contrôles
    this.buttonUnlock = document.createElement("button");
    this.buttonUnlock.className = "reset";
    this.buttonUnlock.innerHTML = "Débloquer";
    this.buttonUnlock.style.visibility = "hidden";
    this.buttonUnlock.onclick = function() {
      let challenge = Challenge.all[challengeId];
      challenge.unlock();
      challenge.buttonUnlock.style.visibility = "hidden";
      challenge.doNotLock = true;
      setTimeout(() => {challenge.doNotLock = false;}, 5000);
    }
    this.doNotLock = false;


    // Construction du thermomètre
    this.thermometer = document.createElement("CANVAS");
    this.thermometer.className = "thermometer";
    this.thermometer.style.border = "0px;";
    this.thermometer.style.visibility = 'hidden';
    this.thermometer.width = 100;
    this.thermometer.height = 300;

    this.gradientStep = 0.001;
    this.grosseTriche = 1;
  }


  /**
   * Ajoute le défi dans le document HTML
   */
  addToDocument() {
    let div, table, col, line, button;

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

      //3e colonne : la valeur
      col = document.createElement("td");
      col.appendChild(p.label);
      line.appendChild(col);

      line.appendChild(col);
      table.appendChild(line);
    }
    div.appendChild(table);

    div.appendChild(this.buttonSolved);
    div.appendChild(this.buttonAutoSolve);
    div.appendChild(this.buttonUnlock);

    //document.getElementById(this.challengeId + "s").innerHTML = "<button class='defiReussi'>Défi réussi !!!</button>";
    //document.getElementById(this.challengeId + "s").style.visibility = "hidden";


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

  /**
   * Effectue la mise à jour du défi.
   * Entre autre, cette fonction est appelée à chaque que les paramètres sont modifiés.
   */
  update() {
    if (this.isActivated) {
      // mise à jour des labels des paramètres
      for (let i in this.parameters) {
        let p = this.parameters[i];
        p.label.innerHTML = parseFloat(p.slider.value).toFixed(3);
      }
      console.log('Challenge : "' + this.challengeId + ' activated');
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
   * Dessine le défi dans son canvas
   */
  drawSelf() {
    let ctx = this.canvas.getContext("2d");
    // Efface tout
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dessine les points
    ctx.fillStyle = '#0000ff';
    for (let i=0; i<this.numPoints; i++) {
      let x = this.points[i][0];
      let y = this.points[i][1];
      let X = this.convertX(x);
      let Y = this.convertY(y);
      //console.log("(" + x + "," + y + ") --> (" + X + "," + Y + ")");
      ctx.beginPath();
      ctx.arc(X, Y, this.dotRadius, 0, 2*Math.PI, false);
      ctx.fill();
    }
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
      this.buttonSolved.style.visibility = "visible";
      if (!this.doNotLock) {
        this.lock();
        this.buttonUnlock.style.visibility = "visible";
      }
    }
    else {
      this.buttonSolved.style.visibility = "hidden";
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
   * Désactive les contrôles du défi.
   */
  lock() {
    for (var i in this.parameters) {
      this.parameters[i].slider.disabled = true;
    }
  }

  /**
   * Active les contrôles du défi.
   */
  unlock() {
    for (var i in this.parameters) {
      this.parameters[i].slider.disabled = false;
    }
  }

  /**
   * Active le défi. Le joueur peut maintenant tenter de le résoudre.
   */
  activate() {
    this.isActivated = true;
    this.unlock();
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
    let blue = 255 - Math.trunc(255 * Math.pow(error, 0.1));
    let red = Math.trunc(255 * Math.pow(error, 0.1));
    let mercury = Math.min(height, Math.trunc(Math.pow(error, 0.25) * height)); // hauteur du mercure dans le thermomètre

    //console.log("error=" + error + ", mercury=" + mercury);

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
    if (errorAfter > errorBefore) {
      //console.log('diminution du step')
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
 * La droite
 */
class ChallengeLine extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire
    this.minError = 0.00004;
    this.adhocErrorFactor = 0.01;
    this.numCurvePoints = 2;

    // Construction des points
    //
    // Les points sont placés le long d'une droite d'équation y = a*x + b
    this.numPoints = 20;
    let a = -0.3;
    let b = 2.0;
    let xmin = -9;
    let xmax = 9;
    for (let i=0; i<this.numPoints; i++) {
      let x = xmin + (xmax - xmin)*(i/(this.numPoints-1));
      let y = a*x + b;
      this.points.push([x, y]);
    }

    // Construction des paramètres
    //
    // Les paramètres sont "a" et "b" pour une droite d'équaiton y = a*x + b
    this.parameters["a0"] = new Parameter(challengeId, -7, 7, 0)
    this.parameters["a1"] = new Parameter(challengeId, -2, 2, 0),

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Dessine l'état actuel du défi. 
   * Il faut obligatoirement appeler `super.drawSelf()`. Cette fonction efface
   * la zone de dessin et y dessine le nuage de points.
   * 
   * Ensuite, cette fonction s'occupe de dessiner la courbe.
   */
  drawSelf() {
    super.drawSelf()
    let ctx = this.canvas.getContext("2d");
    let a = this.parameterValue("a1");
    let b = this.parameterValue("a0");
    let x0 = this.xmin;
    let y0 = a*x0 + b;
    let x1 = this.xmax;
    let y1 = a*x1 + b;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    let X0 = this.convertX(x0);
    let X1 = this.convertX(x1);
    let Y0 = this.convertY(y0);
    let Y1 = this.convertY(y1);
    ctx.moveTo(X0, Y0);
    ctx.lineTo(X1, Y1);
    ctx.stroke();
  }

  /**
   * Calcule l'erreur entre la courbe actuelle et le nuage de points.
   */
  computeError() {
    let a = this.parameterValue("a1");
    let b = this.parameterValue("a0");
    let mse = 0.0;
    let err = null;
    let p = null;
    for (let i=0; i<this.numPoints; i++) {
      p = this.points[i];
      err = a*p[0] + b - p[1];
      mse += err*err;
    }
    return (mse / (this.numPoints)) * this.adhocErrorFactor * this.grosseTriche
  }

  autoSolve() {
    this.gradientDescent(1000000, 2, 5);
  }

}

/**
 * CHALLENGE #2
 *
 * Le polynôme de degré 2
 */
class ChallengePolynome2 extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire
    this.minError = 0.0002;
    this.adhocErrorFactor = 1;
    this.numCurvePoints = 100;

    // Construction des points
    //
    // Les points sont placés le long du polynôme p(x) = a3 x^3 + a2 x^2 + a1 x + a0
    this.numPoints = 25;
    let a0 =  0.65;
    let a1 =  0.28;
    let a2 = -0.41;
    this.p = (x => a0 + a1*x + a2*x*x + a3*x*x*x);
    let xmin = -1.3;
    let xmax =  1.3;
    for (let i=0; i<this.numPoints; i++) {
      let x = xmin + (xmax - xmin)*(i/(this.numPoints-1));
      let y = a0 + a1*x + a2*x*x;
      this.points.push([x, y]);
    }
    this.xmin = -1.5;
    this.xmax =  1.5;
    this.ymin = -0.3;
    this.ymax =  1.0;

    // Construction des paramètres
    //
    // Les paramètres sont "a" et "b" pour une droite d'équaiton y = a*x + b
    this.parameters["a0"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a1"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a2"] = new Parameter(challengeId, -2, 2, 0),

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Dessine l'état actuel du défi. 
   * Il faut obligatoirement appeler `super.drawSelf()`. Cette fonction efface
   * la zone de dessin et y dessine le nuage de points.
   * 
   * Ensuite, cette fonction s'occupe de dessiner la courbe.
   */
  drawSelf() {
    super.drawSelf()
    let ctx = this.canvas.getContext("2d");
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let p = (x => a0 + a1*x + a2*x*x);

    let x = this.xmin;
    let y = p(x);
    let X = this.convertX(x);
    let Y = this.convertY(y);

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(X, Y);
    for (var i=1; i<this.numCurvePoints; ++i) {
      x = this.xmin + (this.xmax - this.xmin) * (i / (this.numCurvePoints-1));
      y = p(x);
      X = this.convertX(x);
      Y = this.convertY(y);
      ctx.lineTo(X, Y);
    }
    ctx.stroke(); 
  }


  /**
   * Calcule l'erreur entre la courbe actuelle et le nuage de points.
   */
  computeError() {
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let p = (x => a0 + a1*x + a2*x*x);
    let mse = 0.0;
    let err = null;
    let pt = null;
    for (let i=0; i<this.numPoints; i++) {
      pt = this.points[i];
      err = p(pt[0]) - pt[1];
      //console.log("   x=" + p[0] + ", y=" + p[1] + ", f(x)=" + (a*p[0] + b) + ", err=" + err);
      mse += err*err;
    }
    console.log("err = " + (mse / (this.numPoints)) * this.adhocErrorFactor * this.grosseTriche);
    return (mse / (this.numPoints)) * this.adhocErrorFactor * this.grosseTriche

  }
}
/**
 * CHALLENGE #3
 *
 * Le polynôme de degré 3
 */
class ChallengePolynome3 extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire
    this.minError = 0.0002;
    this.adhocErrorFactor = 1;
    this.numCurvePoints = 100;

    // Construction des points
    //
    // Les points sont placés le long du polynôme p(x) = a3 x^3 + a2 x^2 + a1 x + a0
    this.numPoints = 25;
    let a0 =  0.02;
    let a1 =  0.66;
    let a2 =  0.53;
    let a3 = -0.47;
    this.p = (x => a0 + a1*x + a2*x*x + a3*x*x*x);
    let xmin = -1.3;
    let xmax =  1.3;
    for (let i=0; i<this.numPoints; i++) {
      let x = xmin + (xmax - xmin)*(i/(this.numPoints-1));
      let y = a0 + a1*x + a2*x*x + a3*x*x*x;
      this.points.push([x, y]);
    }
    this.xmin = -1.5;
    this.xmax =  1.5;
    this.ymin = -0.3;
    this.ymax =  1.0;

    // Construction des paramètres
    //
    // Les paramètres sont "a" et "b" pour une droite d'équaiton y = a*x + b
    this.parameters["a0"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a1"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a2"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a3"] = new Parameter(challengeId, -2, 2, 0),

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Dessine l'état actuel du défi. 
   * Il faut obligatoirement appeler `super.drawSelf()`. Cette fonction efface
   * la zone de dessin et y dessine le nuage de points.
   * 
   * Ensuite, cette fonction s'occupe de dessiner la courbe.
   */
  drawSelf() {
    super.drawSelf()
    let ctx = this.canvas.getContext("2d");
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let a3 = this.parameterValue("a3");
    let p = (x => a0 + a1*x + a2*x*x + a3*x*x*x);

    let x = this.xmin;
    let y = p(x);
    let X = this.convertX(x);
    let Y = this.convertY(y);

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(X, Y);
    for (var i=1; i<this.numCurvePoints; ++i) {
      x = this.xmin + (this.xmax - this.xmin) * (i / (this.numCurvePoints-1));
      y = p(x);
      X = this.convertX(x);
      Y = this.convertY(y);
      ctx.lineTo(X, Y);
    }
    ctx.stroke(); 
  }


  /**
   * Calcule l'erreur entre la courbe actuelle et le nuage de points.
   */
  computeError() {
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let a3 = this.parameterValue("a3");
    let p = (x => a0 + a1*x + a2*x*x + a3*x*x*x);
    let mse = 0.0;
    let err = null;
    let pt = null;
    for (let i=0; i<this.numPoints; i++) {
      pt = this.points[i];
      err = p(pt[0]) - pt[1];
      //console.log("   x=" + p[0] + ", y=" + p[1] + ", f(x)=" + (a*p[0] + b) + ", err=" + err);
      mse += err*err;
    }
    return (mse / (this.numPoints)) * this.adhocErrorFactor * this.grosseTriche
  }
}

/**
 * CHALLENGE #n (dernier)
 *
 * Le polynôme de degré 4
 */
class ChallengePolynome4 extends Challenge {

  constructor(challengeId) {
    super(challengeId); // ligne obligatoire
    this.minError = 0.0000001;
    this.adhocErrorFactor = 1;

    // Construction des points
    //
    // Les points sont placés le long du polynôme p(x) = a4 x^4 + a3 x^3 + a2 x^2 + a1 x + a0
    this.numPoints = 25;
    let a0 =  0.13;
    let a1 =  -0.8;
    let a2 =  0.72;
    let a3 =  0.79;
    let a4 = -0.68;
    this.p = (x => a0 + a1*x + a2*x*x + a3*x*x*x + a4*x*x*x*x);
    let xmin = -1.3;
    let xmax =  1.3;
    for (let i=0; i<this.numPoints; i++) {
      let x = xmin + (xmax - xmin)*(i/(this.numPoints-1));
      let y = a0 + a1*x + a2*x*x + a3*x*x*x + a4*x*x*x*x;
      this.points.push([x, y]);
    }
    this.xmin = -1.5;
    this.xmax =  1.5;
    this.ymin = -0.3;
    this.ymax =  1.0;

    // Construction des paramètres
    //
    // Les paramètres sont "a" et "b" pour une droite d'équaiton y = a*x + b
    this.parameters["a0"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a1"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a2"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a3"] = new Parameter(challengeId, -2, 2, 0),
    this.parameters["a4"] = new Parameter(challengeId, -2, 2, 0),

    this.addToDocument(); // ligne obligatoire
    this.update(); // ligne obligatoire
  }

  /**
   * Dessine l'état actuel du défi. 
   * Il faut obligatoirement appeler `super.drawSelf()`. Cette fonction efface
   * la zone de dessin et y dessine le nuage de points.
   * 
   * Ensuite, cette fonction s'occupe de dessiner la courbe.
   */
  drawSelf() {
    super.drawSelf()
    let ctx = this.canvas.getContext("2d");
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let a3 = this.parameterValue("a3");
    let a4 = this.parameterValue("a4");
    let p = (x => a0 + a1*x + a2*x*x + a3*x*x*x + a4*x*x*x*x);

    let x = this.xmin;
    let y = p(x);
    let X = this.convertX(x);
    let Y = this.convertY(y);

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(X, Y);
    for (var i=1; i<this.numCurvePoints; ++i) {
      x = this.xmin + (this.xmax - this.xmin) * (i / (this.numCurvePoints-1));
      y = p(x);
      X = this.convertX(x);
      Y = this.convertY(y);
      ctx.lineTo(X, Y);
    }
    ctx.stroke(); 
  }


  /**
   * Calcule l'erreur entre la courbe actuelle et le nuage de points.
   *
   * Il s'agit de l'erreur quadratique moyenne normalisée par un facteur ad hoc 
   * qui sert uniquement à rendre le thermomètre plutôt joli.
   */
  computeError() {
    let a0 = this.parameterValue("a0");
    let a1 = this.parameterValue("a1");
    let a2 = this.parameterValue("a2");
    let a3 = this.parameterValue("a3");
    let a4 = this.parameterValue("a4");
    let p = (x => a0 + a1*x + a2*x*x + a3*x*x*x + a4*x*x*x*x);
    let mse = 0.0;
    let err = null;
    let pt = null;
    for (let i=0; i<this.numPoints; i++) {
      pt = this.points[i];
      err = p(pt[0]) - pt[1];
      //console.log("   x=" + p[0] + ", y=" + p[1] + ", f(x)=" + (a*p[0] + b) + ", err=" + err);
      mse += err*err;
    }
    return (mse / (this.numPoints)) * this.adhocErrorFactor * this.grosseTriche
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
let c1 = new ChallengeLine("challenge1");
let c2 = new ChallengePolynome2("challenge2");
let c3 = new ChallengePolynome3("challenge3");
let c4 = new ChallengePolynome4("challenge4");

// Activation du premier défi
Challenge.all['challenge1'].activate();
//Challenge.all['challenge2'].activate();
//Challenge.all['challenge3'].activate();
//Challenge.all['challenge4'].activate();

function activateAll() {
  for (let i in Challenge.all) {
    Challenge.all[i].activate();
  }
}

function addAutoSolveButtons() {
  for (let i in Challenge.all) {
    Challenge.all[i].buttonAutoSolve.style.visibility = 'visible';
  }
}

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
  activateAll();
  addAutoSolveButtons();
}
