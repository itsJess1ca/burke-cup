'use strict';

// Look for any parameters
let getQueryParameter = function getQueryParameter(p) {
  let urlHashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (let i = 0; i < urlHashes.length; i++) {
    const hash = urlHashes[i].split('=');
    if (hash[0] === p) {
      return hash[1] || true;
    }
  }
};

//New Stuff
let settings = null;
const _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

function loadJSON(callback) {   

  var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
  xobj.open('GET', 'settings.json', true); // Replace 'my_data' with the path to your file
  xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
          // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
          callback(xobj.responseText);
        }
  };
  xobj.send(null);  
}
 
function setSettings(data){
  settings = JSON.parse(data);
}

$(function () {
  const body = $('body');
  let getSettings = loadJSON(function(data){ setSettings(data); init(); });

  
  //Play first alert on load
  const debug = getQueryParameter('debug');
  let freeShot = false;

  let loadingScene = false;
  let muted = false;
  let muteLessThan = 0;

  // PIXI and P2
  let renderer, stage, container, world, debugDrawGraphics;


  // Active in scene
  let gems     = [],
      messages = [],
      fireQ    = [];


  // Pending
  let queuedAlert = [];

  // Track message;
  let messageID = 0;
  let needsDepthSort = false;

  let needDepthSort = false;


  let gemAnimationFrames = {};
  let gemFlashFrames = {};
  let gemMaterial = new p2.Material();
  let chestMaterial = new p2.Material();


  // Globals
  const width = body.width();
  const height = body.height();


  let chestPosition = [width - 150, 0]; // Left side of the screen;
  let chestRadiusAdjust = 24;
  let chestBottomHeight = 15;
  let chestSideLength = 5;
  let chestSideThickness = 210;

  let cannon,
      cannonIsMoving = false,
      cannonVisible  = false,
      cannonExiting  = false;

  let MAXIMUM_TEXT_DISPLAY = 50;
  let TEXT_DISPLAY_START = height - 50;
  let GEM_DROP_POINT = width - 400;

  let chestBottom, chestLeft, chestRight, chestFront, chestBack;

  let GEM_RADIUS = 12;
  let scale_dampening = 0.65;
  let SMALL_CANNON_RADIUS = null;
  let MEDIUM_CANNON_RADIUS = null;
  let LARGE_CANNON_RADIUS = null;
  let XLARGE_CANNON_RADIUS = null;
  let LARGEST_CANNON_RADIUS = null;

  stage = new PIXI.Container();

  function webGLDetect(return_context) {
    if (window.WebGLRenderingContext) {
      var canvas  = document.createElement('canvas'),
          names   = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'],
          context = false;

      for (var i = 0; i < 4; i++) {
        try {
          context = canvas.getContext(names[i]);
          if (context && typeof context.getParameter === 'function') {
            // WebGL is enabled
            if (return_context) {
              // return WebGL object if the function's argument is present
              return {name: names[i], gl: context};
            }
            // else, return just true
            return true;
          }
        } catch (e) {
          if (debug) console.log(e);
        }
      }

      // WebGL is supported, but disabled
      return false;
    }

    // WebGL not supported
    return false;
  }

  function addBoundingBox() {

    // Bottom
    chestBottom = new p2.Body({
      position: [chestPosition[0],
        chestPosition[1] - 7]
    });
    chestBottom.addShape(new p2.Box({
      width: settings.chest.width - 21,
      height: chestBottomHeight,
      material: chestMaterial
    }));

    // Left
    let angle = -3.25;
    chestLeft = new p2.Body({
      angle: Math.PI - angle,
      position: [chestPosition[0] - settings.chest.width / 2.3,
        chestPosition[1] + chestRadiusAdjust]
    });
    chestLeft.addShape(new p2.Box({
      width: chestSideLength * 2,
      height: chestSideThickness,
      material: chestMaterial
    }));

    // Right
    chestRight = new p2.Body({
      angle: angle,
      position: [chestPosition[0] + settings.chest.width / 2.3,
        chestPosition[1] + chestRadiusAdjust]
    });
    chestRight.addShape((new p2.Box({
      width: chestSideLength * 2,
      height: chestSideThickness,
      material: chestMaterial
    })));

    world.addBody(chestBottom);
    world.addBody(chestLeft);
    world.addBody(chestRight);
  }

  function addChestBackground() {
    chestBack = new PIXI.Sprite.fromImage('assets/images/chest_back.png');
    chestBack.position.x = chestPosition[0] - settings.chest.width / 2;
    chestBack.position.y = height - chestPosition[1] - settings.chest.height + 7;
    chestBack.height = settings.chest.height; // Need to set;
    chestBack.width = settings.chest.width; // Need to set

    stage.addChild(chestBack);
  }

  function addChestFront() {
    chestFront = new PIXI.Sprite.fromImage('assets/images/chest_front.png');
    chestFront.position.x = chestPosition[0] - settings.chest.width / 2;
    chestFront.position.y = height - chestPosition[1] - settings.chest.height;
    chestFront.height = settings.chest.height; // Need to set;
    chestFront.width = settings.chest.width; // Need to set

    stage.addChild(chestFront);
  }

  function addCannon() {
    cannon = new PIXI.Sprite.fromImage('assets/images/cannon.png');
    cannon.height = settings.cannon.height;
    cannon.width = settings.cannon.width;
    cannon.position.x = 0 - cannon.width;
    cannon.position.y = height - chestPosition[1] - (settings.chest.height / 2) - 175;

    cannon.rotation = 0

    stage.addChild(cannon);
  }

  function moveCannon(way) {
    //console.log(way, cannon.position.x, (cannon.width * 2 + 50));
    if (way === 'left') {

      if (cannon.position.x >= (cannon.width) * -1) {
        cannon.position.x -= 5;
      } else {
        cannon.position.x -= 5;
        cannonExiting = false;
        cannonVisible = false;
        cannonIsMoving = false;
      }
    }

    if (way === 'right') {
      if (cannon.position.x >= 0) {
        cannonIsMoving = false;
      } else {
        cannon.position.x += 5;

      }
    }
  }

  function randomRange(low, high) {
    return Math.random() * (high - low) + low;
  }

  function rotation(mag, rad) {
    return [Math.cos(rad) * mag, Math.sin(rad) * mag];
  }

  let Gem = function () {
    function Gem(physical, renderable, animationFrames, tier, amount, type) {
      _classCallCheck(this, Gem);
      this.amount = amount;
      this.physical = physical;
      this.renderable = renderable;

      // Set to true when the gem begins falling under the influence of gravity.
      this.falling = false;

      // This is roughly how many game frames it takes the gem animation to complete.
      this.startingGemAnimationGameFrames = animationFrames;

      // A counter to count frames until the gem animation is done.
      this.gemAnimationGameFrames = 0;

      this.tier = tier;

      //this.amount = amount;

      if(!type || typeof type === 'number'){
        this.type = "cheer";
      }else{
        this.type = type.toLowerCase();
      }
    }

    _createClass(Gem, [{
      key: 'sync',
      value: function sync() {
        setPointFromPosition(this.renderable.position, this.physical.position);
        this.renderable.rotation = this.physical.angle;
      }
    }, {
      key: 'updateAnimationFrames',
      value: function updateAnimationFrames() {
        if (this.gemAnimationGameFrames > 0) {
          this.gemAnimationGameFrames--;
          if (this.gemAnimationGameFrames === 0) {
            container.removeChild(this.renderable);
            console.log('in glimmer');
            // Transform this gem into a flashing gem.
            var glimmerFrames = gemFlashFrames[this.type][this.tier];
            var gem = new PIXI.extras.MovieClip(glimmerFrames);
            gem.animationSpeed = 24 / 60;
            gem.gotoAndPlay(Math.floor(randomRange(0, gem.totalFrames)));
            gem.scale = this.renderable.scale;
            gem.anchor.x = 0.5;
            gem.anchor.y = 0.5;
            gem.depth = this.renderable.depth;

            container.addChild(gem);
            this.renderable = gem;
            needsDepthSort = true;
          }
        }
      }
    }, {
      key: 'update',
      value: function update(dt) {
        this.updateAnimationFrames();
        if (this.falling) {

          // Die when the gem falls out of bounds.
          if (this.physical.position[0] < 0 - GEM_RADIUS || this.physical.position[0] > width + GEM_RADIUS || this.physical.position[1] < 0 - GEM_RADIUS) {
            this.dead = true;
          }

          if (this.falling && this.physical.position[1] < TEXT_DISPLAY_START - 40 * (MAXIMUM_TEXT_DISPLAY - 45) && !this.hasRenderBody) {
            let size = setGemSize(this.amount, this.type);
            let gemShape = new p2.Circle({radius: size.radius, material: gemMaterial});
            this.physical.addShape(gemShape);
            this.hasRenderBody = true;

            setTimeout(function () {
              fireQ.pop();
            }, 2000);
          }

          if (this.physical.mass >= this.tier && this.physical.mass > 0) {
            this.physical.mass = this.physical.mass - dt * this.tier;
            this.physical.updateMassProperties();
          }
        }
        else {
          // Update the position, and then turn on physics when we hit the rim of the cup.
          //this.physical.position[0] += dt * 150;


          // Start playing the animation and sound when the gem is on screen.
          if (this.physical.position[0] < cannon.position.x && this.gemAnimationGameFrames === 0 && this.falling === false) {
            this.gemAnimationGameFrames = this.startingGemAnimationGameFrames;
            this.renderable.gotoAndPlay(0);

            if (!muted && this.amount >= muteLessThan) {
              var sfx = $('.js-gem-sound-' + this.tier).clone()[0];
              if (this.amount < 100) {
                sfx.volume = 0.05;
              } else {
                sfx.volume = 0.15;
              }
              sfx.play();
            }
          }
          // Once it reaches the drop point, let physics happen.
          if (this.physical.position[0] > GEM_DROP_POINT && this.falling === false) {
            this.physical.updateMassProperties();
            this.falling = true;
          }
          // Stop playing animation once in chest
          if (this.physical.position[0] > chestLeft.position[0] - 230 && !this.hasReachedChest) {
            console.log('changing to glimmer');
            this.hasReachedChest = true;
            this.gemAnimationGameFrames = this.startingGemAnimationGameFrames;
          }
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        world.removeBody(this.physical);
        container.removeChild(this.renderable);
        this.renderable.destroy();
      }
    }]);

    return Gem;
  }();

  let ScrollingText = function () {
    function ScrollingText(rank, renderables) {
      _classCallCheck(this, ScrollingText);

      this.rank = rank;
      this.renderables = renderables;

    }

    _createClass(ScrollingText, [{
      key: 'update',
      value: function update(dt) {
        this.dead = true;
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        _.each(this.renderables, function (r) {
          container.removeChild(r);
          r.destroy();
        });
      }
    }]);

    return ScrollingText;
  }();


  function addGem(x, y, tier, depth, amount, type) {
    let xVel, yVel;

    if (amount > 4999) {
      xVel = randomRange(parseInt(settings.gemRanges.amount.excellent.xVel[0]), parseInt(settings.gemRanges.amount.excellent.xVel[1]));
      yVel = randomRange(parseInt(settings.gemRanges.amount.excellent.yVel[0]), parseInt(settings.gemRanges.amount.excellent.yVel[1]));
    } else if (amount > 999) {
      xVel = randomRange(parseInt(settings.gemRanges.amount.great.xVel[0]), parseInt(settings.gemRanges.amount.great.xVel[1]));
      yVel = randomRange(parseInt(settings.gemRanges.amount.great.yVel[0]), parseInt(settings.gemRanges.amount.great.yVel[1]));
    } else if (amount > 99) {
      xVel = randomRange(parseInt(settings.gemRanges.amount.good.xVel[0]), parseInt(settings.gemRanges.amount.good.xVel[1]));
      yVel = randomRange(parseInt(settings.gemRanges.amount.good.yVel[0]), parseInt(settings.gemRanges.amount.good.yVel[1]));
    } else {
      xVel = randomRange(parseInt(settings.gemRanges.amount.ok.xVel[0]), parseInt(settings.gemRanges.amount.ok.xVel[1]));
      yVel = randomRange(parseInt(settings.gemRanges.amount.ok.yVel[0]), parseInt(settings.gemRanges.amount.ok.yVel[1]));
    }
    // cannon.rotation = -2.3;
    let origY = height - chestPosition[1] - (settings.chest.height / 2) + 20;
    
    //Push new bullet into cannon
    fireQ.push(1);

    let body = new p2.Body({
      mass: Math.floor(Math.random() * Math.floor(Math.random() * tier + tier) + amount),
      damping: 0.01,
      type: p2.Body.DYNAMIC,
      angularDamping: 0.7,
      position: [x, y - GEM_RADIUS],
      velocity: [xVel, yVel],
      angularVelocity: -1,
      overlaps: true
    });

    world.addBody(body);
    
    if(!type){
      type = "cheer"
    }
    // console.log(type,tier, amount);
    var animationFrames = gemAnimationFrames[type][tier];
    var gem = new PIXI.extras.MovieClip(animationFrames);
    gem.animationSpeed = 24 / 60;
    gem.play();
    gem.anchor.x = 0.5;
    gem.anchor.y = 0.5;

    let getGemsize = setGemSize(amount, type);

    gem.width += getGemsize.width;
    gem.height += getGemsize.width;
    let scale = getGemsize.radius * getGemsize.multiplier / (gem.width * scale_dampening);
    gem.scale = new PIXI.Point(scale, scale);

    // The gems are slightly larger than the collision body, so overlaps will happen.
    //gem.scale = new PIXI.Point(GEM_RADIUS * 4 / gem.width, GEM_RADIUS * 4 / gem.width);
    gem.depth = depth;

    // The scaling factor of 60 / 24 * 3 was experimentally derived.
    var gemMovieGameFrames = Math.ceil(gem.totalFrames * 60 / 24 * 3);

    // Add the box to our container
    container.addChild(gem);

    var res = new Gem(body, gem, gemMovieGameFrames, tier, amount, type);
    gems.push(res);

    needsDepthSort = true;
    return res;
  }


  function setGemSize(amount, type) {
    let radius, multiplier, width;

    if(amount > 9999){ 
      width = settings.gems.sizes.largest.width;
      radius = LARGEST_CANNON_RADIUS;
      multiplier = settings.gems.sizes.largest.size_multiplier;
      if(type !== 'cheer') multiplier = 3;
    }else if(amount > 4999){
      width = settings.gems.sizes['x-large'].width;
      radius = XLARGE_CANNON_RADIUS;
      multiplier = settings.gems.sizes['x-large'].size_multiplier;
      if(type !== 'cheer') multiplier = 3;
    }else if(amount > 999){
      width = settings.gems.sizes.large.width;
      radius = LARGE_CANNON_RADIUS;
      multiplier = settings.gems.sizes.large.size_multiplier;
      if(type !== 'cheer') multiplier = 3;
    }else if(amount > 99){
      width = settings.gems.sizes.medium.width;
      radius = MEDIUM_CANNON_RADIUS;
      multiplier = settings.gems.sizes.medium.size_multiplier;
      if(type !== 'cheer') multiplier = 3;
    }else{
      width = settings.gems.sizes.small.width;
      radius = SMALL_CANNON_RADIUS;
      multiplier = settings.gems.sizes.small.size_multiplier;
      if(type !== 'cheer') multiplier = 3;
    }
    return {radius, multiplier, width};
  }


  function addAlert(user, msg, emotes, bits) {
    cannonVisible = true;
    cannonExiting = false;
    cannonIsMoving = true;

    queuedAlert.push({
      user: user,
      message: msg,
      emotes: emotes,
      bits: bits
    });
  }

  function getPointsThreshold(amount) {
    // Points threshold.
    let threshold = 1;
    if (amount >= 10000) {
      threshold = 10000;
    } else if (amount >= 5000) {
      threshold = 5000;
    } else if (amount >= 1000) {
      threshold = 1000;
    } else if (amount >= 100) {
      threshold = 100;
    }

    return threshold;
  }
  
  function getSubsThreshold(amount) {
    // sub threshold.
    amount = parseInt(amount);
    let threshold = 1;
    if (amount >= 24) {
      threshold = 5;
    } else if (amount >= 12) {
      threshold = 4;
    } else if (amount >= 6) {
      threshold = 3;
    } else if (amount >= 3) {
      threshold = 2;
    }
    return threshold;
  }
  
  function getTipThreshold(amount) {
    // tip threshold in cents
    let threshold = 1;
    if (amount >= 10000) {
      threshold = 3;
    } else if (amount >= 5000) {
      threshold = 2;
    }
    return threshold;
  }
  
  function createText() {
    let i, j;

    // Return if nothing queued
    if (queuedAlert.length === 0) return;

    // Find an open lane.
    var exists = {};
    for (i = 0; i < messages.length; i++) {
      exists[messages[i].rank] = 1;
    }
    var nextRank = undefined;
    for (i = 0; i < MAXIMUM_TEXT_DISPLAY; i++) {
      if (exists[i] === undefined) {
        nextRank = i;
        break;
      }
    }

    if (nextRank === undefined) return;

    let text = queuedAlert[0];
    queuedAlert.splice(0, 1);

    // This is a list of { emote-id, indices: [start, end] }
    var emoteListing = [];

    // Split the emotes field on /
    text.emotes = text.emotes || '';
    if (text.emotes !== '') {
      let emotes = text.emotes.split('/');
      for (i = 0; i < emotes.length; i++) {
        // Invert this index, turning it into starting-char -> emote id, length.
        let data = emotes[i];
        let idSplit = data.split(':');
        let values = idSplit[1].split(',');

        // Turn the values into integer pairs of start and ending points.
        let _indices = _.map(values, function (v) {
          let indices = v.split('-');
          return [parseInt(indices[0], 10), parseInt(indices[1], 10)];
        });

        // Add each emote index pair to the list.
        _.each(_indices, function (v) {
          emoteListing.push({
            id: idSplit[0],
            indices: v
          });
        });
      }
    }

    // This sorts the emotes from first to last in order of appearance.
    emoteListing = _.sortBy(emoteListing, function (a) {
      return a.indices[0];
    });

    // Then reverse them, since replacing the last emote does not change indices of prior emotes.
    emoteListing = emoteListing.reverse();
    let replaceRange = function replaceRange(msg, b, e) {
      return msg.substr(0, b) + '\x01' + msg.substr(e + 1);
    };

    let message = text.message;
    for (i = 0; i < emoteListing.length; i++) {
      let range = emoteListing[i];
      message = replaceRange(message, range.indices[0], range.indices[1]);
    }
     
    let messageTable = [];
     
    if(message.indexOf("_sub_cheer_token_") >= 0){
      let s = /_sub_cheer_token_(\d+)/g;
      let st = message.match(s);
      let m = st[0].replace("_sub_cheer_token_","")
      if(m == "0"){
        m = "1";
      }
      message = message.replace("_sub_cheer_token_","")
      
      messageTable.push({
        prefix: "",
        emote: { id: "-2" },
        amount: m,
        type:"sub_"
      })
      message = message.substr(2,message.length);
    }
     
    if(message.indexOf("_tip_cheer_token_") >= 0){
      let s = /_tip_cheer_token_(\d+)/g;
      let st = message.match(s);
      let m = st[0].replace("_tip_cheer_token_","")
      // console.log(s,st,m)
      if(m == "0"){
        m = "1";
      }
      message = message.replace("_tip_cheer_token_","")
      messageTable.push({
        prefix: "",
        emote: { id: "-3" },
        amount: m,
        type:"tip"
      })
      message = message.substr(m.length,message.length);
    }

    // Split on 0x01, which gives us a set of messages seperated by emotes.
    let splitMessage = message.split('\x01');
    var givepointsRegex = /(?:^|\s)(cheer|muxy|swiftrage|kreygasm|kappa|streamlabs|burkecheer)(\d+)(?=$|\s)/g;
    var amountRegex = /(?:^|\s)(cheer|muxy|swiftrage|kreygasm|kappa|streamlabs|burkecheer)(\d+)(?=$|\s)/;

    // Begin assembling the {prefix, emote} table.
    let forwardEmoteListing = emoteListing.reverse();

    // At the end there is a sentinel '0' emote, which is no emote.
    forwardEmoteListing.push({
      id: '0'
    });

    let total = 0;
    let expected = text.bits;

    // At this point, splitMessage is a list of text fragments. Between each fragment is an emote.
    for (i = 0; i < splitMessage.length; i++) {
      let part = splitMessage[i];
      part = part.toLowerCase();
      // Then, look for givepoints objects
      let matches = part.match(givepointsRegex);
      let splits = part.replace(givepointsRegex, '\x01').split('\x01');

      // Splits is now a list of text fragments, between each of which is a givepoints command.
      for (j = 0; j < splits.length - 1; ++j) {
        let matchResults = matches[j].match(amountRegex);
        let amount = parseInt(matchResults[2]);
        var type = matchResults[1];
        if (total + amount > expected) {
          // Skip this one, as it exceeds the number of bits in the message.
          messageTable.push({
            prefix: splits[j].trim() + matches[j],
            emote: {id: '0'}
          });
        } else {
          // Push each fragment, with a gem afterwards.
          messageTable.push({
            prefix: splits[j].trim(),
            emote: {id: '-1'},
            amount: amount,
            type: type
          });

          total += amount;
        }
      }

      // Push the final message, with the emote afterwards.
      messageTable.push({
        prefix: splits[splits.length - 1].trim(),
        emote: forwardEmoteListing[i]
      });
    }

    // Prepend the username.
     messageTable[0].prefix = '';


    // Begin constructing the display objects.
    let resultingTextObjects = [];
    let properties = {
      font: "26px 'Knewave', cursive",
      fill : 'whitesmoke',
      stroke : '#333333',
      strokeThickness : 5,
      align: 'left',
      lineJoin: 'round',
    };
    let currentOffset = width + 100;
    let textHeight = 55;

    // Fire Sound
      //Play sound
      var sfx = $('.js-cannon').clone()[0];
      sfx.volume = settings.sounds.cannon;
      sfx.play();

      if(!loadingScene){
        cannon.position.y = cannon.position.y + 10;
        cannon.position.x = cannon.position.x - 5;
        setTimeout(function () {
          cannon.position.y = cannon.position.y - 10;
          cannon.position.x = cannon.position.x + 5;
        }, 250)
      }

    // Add Gems
    for (i = 0; i < messageTable.length; i++) {
      let msg = messageTable[i];

      // If there is a non-empty prefix, generate a text object.
      if (msg.prefix.length !== 0 && msg.emote.id !== "0") {
        let textDisplay = new PIXI.Text(msg.prefix, properties);
        textDisplay.scale = new PIXI.Point(1, -1);
        let yOffset = (cannon.y - height) + (cannon.height + 475);
        if(messages[messages.length -1] !== undefined){
          yOffset = messages[messages.length -1].renderables[0].y + 55;
        }

        textDisplay.position = new PIXI.Point(cannon.width / 2, yOffset);
        // container.addChild(textDisplay);
        currentOffset += textDisplay.width;
        resultingTextObjects.push(textDisplay);
      }

      //console.log(msg, msg.emote.id);
      let gemX = 195;
      let gemY = 240;
      if (msg.emote.id === "-3") {
        // If the emote is a tip.
        let a = parseInt(msg.amount);
        let tier = getTipThreshold(a);
        addGem(gemX, gemY, tier, messageID * 10000 + tier + i, a, msg.type);
        currentOffset += GEM_RADIUS * 2 + 10;
      }else if (msg.emote.id === "-2") {
        // If the emote is a sub.
        let a = parseInt(msg.amount);
        let tier = getSubsThreshold(a);
        let v = msg.amount*100;
        addGem(gemX, gemY, tier, messageID * 10000 + tier + i, v, msg.type);
        currentOffset += GEM_RADIUS * 2 + 10;
      }else if (msg.emote.id === '-1') {
        // If the emote is a gem, add a gem.
        let tier = getPointsThreshold(msg.amount);
        addGem(gemX, gemY, tier, messageID * 10000 + tier + i, msg.amount, msg.type);
        currentOffset += GEM_RADIUS * 2 + 10;
      } else if (msg.emote.id === '0') {

        // Do nothing.
      } else {
        // This is an emote, construct a sprite.
        let emoteDisplay = new PIXI.Sprite.fromImage('/points/emote/' + msg.emote.id);
        emoteDisplay.scale = new PIXI.Point(1, -1);

        // These pixel adjustments were experimentally derived.
        emoteDisplay.position = new PIXI.Point(width / 2, height + textHeight);
        currentOffset += 38;
        if(msg.emote.id !== "0"){
          container.addChild(emoteDisplay);
          resultingTextObjects.push(emoteDisplay);
        }

      }
    }
    messages.push(new ScrollingText(nextRank, resultingTextObjects));
    messageID++;
    needsDepthSort = true;
  }

  function clearAllGems() {
    _.each(gems, function (g) {
      g.dead = true;
    });
    fireQ = [];
  }

  function rumbleChest() {
    chestBottom.velocity = [0,200];
    chestFront.position.y += 25;
    chestBack.position.y += 25;
    chestBottom.updateMassProperties();
    setTimeout(function() {
      chestBottom.velocity = [0, -200];
      chestFront.position.y -= 25;
      chestBack.position.y -= 25;
      chestBottom.updateMassProperties();
    }, 30);
  }

  function setPointFromPosition(point, position) {
    point.x = position[0];
    point.y = position[1];
  }

  function update(dt) {

    if(chestBottom.position[1] <= chestPosition[1] - 7){
      chestBottom.velocity = [0, 0];
      chestBottom.position.y += 1;
      chestBottom.updateMassProperties();
    }

    if (cannonVisible === true && cannonIsMoving === true && cannonExiting === true) {
      cannonExiting = false;
    }

    if (needDepthSort) {
      container.children.sort(depthSort);
      needDepthSort = false;
    }

    gems = _.filter(gems, function (g) {
      if (g.dead) {
        g.destroy();
      }
      return !g.dead;
    });

    if (gems.length > 0) {
      for (let i = 0; i < gems.length; i++) {
        gems[i].update(dt);
        gems[i].sync();
      }

    }

    messages = _.filter(messages, function (t) {
      if (t.dead) {
        t.destroy();
      }
      return !t.dead;
    });

    if (messages.length < MAXIMUM_TEXT_DISPLAY && cannonVisible === true && cannonIsMoving === false) {
      createText();
    }


    for (let i = 0; i < messages.length; i++) {
      messages[i].update(dt);
    }


    if (cannonVisible === true) {
      if (fireQ.length === 0 && cannonIsMoving === false) {
        cannonExiting = true;
      }

      if (cannonExiting === true && cannonIsMoving === false) {
        moveCannon('left');
      }

      if (cannonIsMoving === true && cannonExiting === false) {
        moveCannon('right');
      }

    }

  }

  function debugRenderWorld(world, renderer) {
    renderer.clear();

    var colors = [0x000000, 0xFFFF00, 0x1CE6FF, 0xFF34FF, 0xFF4A46, 0x008941, 0x006FA6, 0xA30059, 0xFFDBE5, 0x7A4900, 0x0000A6, 0x63FFAC, 0xB79762, 0x004D43, 0x8FB0FF, 0x997D87, 0x5A0007, 0x809693, 0xFEFFE6, 0x1B4400, 0x4FC601, 0x3B5DFF, 0x4A3B53, 0xFF2F80, 0x61615A, 0xBA0900, 0x6B7900, 0x00C2A0, 0xFFAA92, 0xFF90C9, 0xB903AA, 0xD16100, 0xDDEFFF, 0x000035, 0x7B4F4B, 0xA1C299, 0x300018, 0x0AA6D8, 0x013349, 0x00846F, 0x372101, 0xFFB500, 0xC2FFED, 0xA079BF, 0xCC0744, 0xC0B9B2, 0xC2FF99, 0x001E09, 0x00489C, 0x6F0062, 0x0CBD66, 0xEEC3FF, 0x456D75, 0xB77B68, 0x7A87A1, 0x788D66, 0x885578, 0xFAD09F, 0xFF8A9A, 0xD157A0, 0xBEC459, 0x456648, 0x0086ED, 0x886F4C, 0x34362D, 0xB4A8BD, 0x00A6AA, 0x452C2C, 0x636375, 0xA3C8C9, 0xFF913F, 0x938A81, 0x575329, 0x00FECF, 0xB05B6F, 0x8CD0FF, 0x3B9700, 0x04F757, 0xC8A1A1, 0x1E6E00, 0x7900D7, 0xA77500, 0x6367A9, 0xA05837, 0x6B002C, 0x772600, 0xD790FF, 0x9B9700, 0x549E79, 0xFFF69F, 0x201625, 0x72418F, 0xBC23FF, 0x99ADC0, 0x3A2465, 0x922329, 0x5B4534, 0xFDE8DC, 0x404E55, 0x0089A3, 0xCB7E98, 0xA4E804, 0x324E72, 0x6A3A4C];

    var rotate = function rotate(v, rads) {
      var c = Math.cos(rads);
      var s = Math.sin(rads);

      return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
    };

    for (var bi in world.bodies) {
      var body = world.bodies[bi];

      renderer.beginFill(colors[bi], 1);
      for (var si in body.shapes) {
        var shape = body.shapes[si];
        switch (shape.type) {
          case p2.Shape.CIRCLE:
            renderer.drawCircle(shape.position[0] + body.position[0], height - (shape.position[1] + body.position[1]), shape.radius);
            break;
          case p2.Shape.CONVEX:
            var verts = [];
            var rotatedPosition = rotate(shape.position, body.angle);
            for (var i = 0; i < shape.vertices.length; i++) {
              var rotated = rotate(shape.vertices[i], body.angle);

              verts.push(rotatedPosition[0] + body.position[0] + rotated[0]);
              verts.push(height - (rotatedPosition[1] + body.position[1] + rotated[1]));
            }
            renderer.drawPolygon(verts);
            break;
          default:
            if (debug) console.log(body.shapes[si]);
            break;
        }
      }
      renderer.endFill();
    }
  }

  function sendSettings(data){
    settings = data;
    // console.log(settings);
  }

  function init() {
    
    //let loader = PIXI.loader; // pixi exposes a premade instance for you to use.
    //or
    /*let loader = new PIXI.loaders.Loader(); // you can also create your own if you want
    loader.add('settings', 'settings.json');
    loader.load((loader, resources) => {
      sendSettings(resources.settings.data);
    });*/

    SMALL_CANNON_RADIUS = settings.gems.sizes.small.radius;
    MEDIUM_CANNON_RADIUS = settings.gems.sizes.medium.radius;
    LARGE_CANNON_RADIUS = settings.gems.sizes.large.radius;
    XLARGE_CANNON_RADIUS = settings.gems.sizes['x-large'].radius;
    LARGEST_CANNON_RADIUS = settings.gems.sizes.largest.radius;
    

    world = new p2.World({
      gravity: [0, -98.20]
    });

    world.addContactMaterial(new p2.ContactMaterial(gemMaterial, gemMaterial, {
      relaxation: 0.8,
      friction: 0,
      restitution: 0.2,
      stiffness: p2.Equation.DEFAULT_STIFFNESS * 100
    }));
    world.addContactMaterial(new p2.ContactMaterial(gemMaterial, chestMaterial, {
      relaxation: 0.8,
      friction: 0,
      restitution: 0.2,
      stiffness: Number.MAX_VALUE
    }));


    // Initialize the stage
    if (webGLDetect()) {
      renderer = new PIXI.WebGLRenderer(width, height, {transparent: true});
    } else {
      renderer = new PIXI.CanvasRenderer(width, height, {transparent: true});
    }

    stage = new PIXI.Container();

    // Add Chest Background
    addChestBackground();

    container = new PIXI.Container(), container.scale.y = -1;
    stage.addChild(container);

    container.position.y = renderer.height;

    document.body.appendChild(renderer.view);

    // Add Chest Foreground
    addChestFront();

    // Add Cannon
    addCannon();

    debugDrawGraphics = new PIXI.Graphics();
    stage.addChild(debugDrawGraphics);
    addBoundingBox();
    PIXI.loader
      .add('assets/images/point-sprites/cheer/1.json')
      .add('assets/images/point-sprites/cheer/100.json')
      .add('assets/images/point-sprites/cheer/1000.json')
      .add('assets/images/point-sprites/cheer/5000.json')
      .add('assets/images/point-sprites/cheer/10000.json')
      .add("assets/images/point-sprites/tip/bronze.json")
      .add("assets/images/point-sprites/tip/silver.json")
      .add("assets/images/point-sprites/tip/gold.json")
      .add("assets/images/point-sprites/kappa/kappa_1.json")
      .add("assets/images/point-sprites/kappa/kappa_100.json")
      .add("assets/images/point-sprites/kappa/kappa_1000.json")
      .add("assets/images/point-sprites/kappa/kappa_5000.json")
      .add("assets/images/point-sprites/kappa/kappa_10000.json")
      .add("assets/images/point-sprites/kreygasm/kreygasm_1.json")
      .add("assets/images/point-sprites/kreygasm/kreygasm_100.json")
      .add("assets/images/point-sprites/kreygasm/kreygasm_1000.json")
      .add("assets/images/point-sprites/kreygasm/kreygasm_5000.json")
      .add("assets/images/point-sprites/kreygasm/kreygasm_10000.json")
      .add("assets/images/point-sprites/swiftrage/swiftrage_1.json")
      .add("assets/images/point-sprites/swiftrage/swiftrage_100.json")
      .add("assets/images/point-sprites/swiftrage/swiftrage_1000.json")
      .add("assets/images/point-sprites/swiftrage/swiftrage_5000.json")
      .add("assets/images/point-sprites/swiftrage/swiftrage_10000.json")
      .add("assets/images/point-sprites/muxy/muxy_1.json")
      .add("assets/images/point-sprites/muxy/muxy_100.json")
      .add("assets/images/point-sprites/muxy/muxy_1000.json")
      .add("assets/images/point-sprites/muxy/muxy_5000.json")
      .add("assets/images/point-sprites/muxy/muxy_10000.json")
      .add("assets/images/point-sprites/streamlabs/streamlabs_1.json")
      .add("assets/images/point-sprites/streamlabs/streamlabs_100.json")
      .add("assets/images/point-sprites/streamlabs/streamlabs_1000.json")
      .add("assets/images/point-sprites/streamlabs/streamlabs_5000.json")
      .add("assets/images/point-sprites/streamlabs/streamlabs_10000.json")
      .add("assets/images/point-sprites/burkecheer/1.json")
      .add("assets/images/point-sprites/burkecheer/100.json")
      .add("assets/images/point-sprites/burkecheer/1000.json")
      .add("assets/images/point-sprites/burkecheer/5000.json")
      .add("assets/images/point-sprites/burkecheer/10000.json")
      .add("assets/images/point-sprites/4head/1.json")
      .add("assets/images/point-sprites/4head/100.json")
      .add("assets/images/point-sprites/4head/1000.json")
      .add("assets/images/point-sprites/4head/5000.json")
      .add("assets/images/point-sprites/4head/10000.json")
      .add("assets/images/point-sprites/failfish/1.json")
      .add("assets/images/point-sprites/failfish/100.json")
      .add("assets/images/point-sprites/failfish/1000.json")
      .add("assets/images/point-sprites/failfish/5000.json")
      .add("assets/images/point-sprites/failfish/10000.json")
      .add("assets/images/point-sprites/mrdestructoid/1.json")
      .add("assets/images/point-sprites/mrdestructoid/100.json")
      .add("assets/images/point-sprites/mrdestructoid/1000.json")
      .add("assets/images/point-sprites/mrdestructoid/5000.json")
      .add("assets/images/point-sprites/mrdestructoid/10000.json")
      .add("assets/images/point-sprites/notlikethis/1.json")
      .add("assets/images/point-sprites/notlikethis/100.json")
      .add("assets/images/point-sprites/notlikethis/1000.json")
      .add("assets/images/point-sprites/notlikethis/5000.json")
      .add("assets/images/point-sprites/notlikethis/10000.json")
      .add("assets/images/point-sprites/pjsalt/1.json")
      .add("assets/images/point-sprites/pjsalt/100.json")
      .add("assets/images/point-sprites/pjsalt/1000.json")
      .add("assets/images/point-sprites/pjsalt/5000.json")
      .add("assets/images/point-sprites/pjsalt/10000.json")
      .add("assets/images/point-sprites/trihard/1.json")
      .add("assets/images/point-sprites/trihard/100.json")
      .add("assets/images/point-sprites/trihard/1000.json")
      .add("assets/images/point-sprites/trihard/5000.json")
      .add("assets/images/point-sprites/trihard/10000.json")
      .add("assets/images/point-sprites/vohiyo/1.json")
      .add("assets/images/point-sprites/vohiyo/100.json")
      .add("assets/images/point-sprites/vohiyo/1000.json")
      .add("assets/images/point-sprites/vohiyo/5000.json")
      .add("assets/images/point-sprites/vohiyo/10000.json")
    .load(function () {
      var emotes = [
        {
          name:"cheer",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[90, 90, 90, 90, 90],
          startingFrame:1,
          glimmerStart:[32, 32, 32, 32, 32],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return name+"_600px_00"+frameID;
          }
        },
        {
          name:"burkeCheer",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[66, 151, 151, 151, 71],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return "burkeCheer"+name+"/00"+frameID;
          }
        },
        {
          name:"tip",
          breakPoints:[1, 2, 3],
          frames:[32, 32, 32],
          startingFrame:1,
          glimmerStart:[1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"Kappa",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[51, 60, 41, 42, 84],
          startingFrame:1,
          glimmerStart:[6, 8, 5, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_000"+frameID;
          }
        },
        {
          name:"Kreygasm",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[41, 41, 40, 41, 21],
          startingFrame:1,
          glimmerStart:[1, 2, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_000"+frameID;
          }
        },
        {
          name:"SwiftRage",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[36, 36, 36, 71, 80],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_000"+frameID;
          }
        },
        {
          name:"Muxy",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[48, 48, 72, 72, 96],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_000"+frameID;
          }
        },
        {
          name:"StreamLabs",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[144, 160, 160, 200, 160],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"vohiyo",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[11, 11, 21, 29, 24],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"trihard",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[73, 73, 83, 83, 83],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"pjsalt",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[21, 21, 36, 36, 85],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"notlikethis",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[55, 56, 56, 52, 56],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"mrdestructoid",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[21, 21, 21, 20, 23],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"failfish",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[28, 52, 41, 52, 50],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        },
        {
          name:"4head",
          breakPoints:[1, 100, 1000, 5000, 10000],
          frames:[26, 12, 40, 40, 39],
          startingFrame:1,
          glimmerStart:[1, 1, 1, 1, 1],
          frameName:function frameName(name, i) {
            var frameID = "" + i;
            if (i < 10) {
              frameID = "00" + i;
            }else if (i < 100) {
              frameID = "0" + i;
            }
            return this.name+"_"+name+"_00"+frameID;
          }
        }
      ]
      for(var emote_type = 0; emote_type < emotes.length; emote_type++){
        for(var movie = 0; movie < emotes[emote_type].breakPoints.length; movie++){
          var name = emotes[emote_type].breakPoints[movie];
          var frameCount = emotes[emote_type].frames[movie];
          var glimmerStartFrame = emotes[emote_type].glimmerStart[movie];

          var fullFrames = [];
          for(var i = emotes[emote_type].startingFrame; i < frameCount; i++){
            fullFrames.push(PIXI.Texture.fromFrame(emotes[emote_type].frameName(name,i)));
          }

          var glimmerFrames = [];
          for(i = glimmerStartFrame; i < frameCount; i++){
            glimmerFrames.push(PIXI.Texture.fromFrame(emotes[emote_type].frameName(name,i)))
          }

          for(i = 0; i < 150; i++){
            glimmerFrames.push(PIXI.Texture.fromFrame(emotes[emote_type].frameName(name,frameCount - 1)))
          }

          if(!gemAnimationFrames[emotes[emote_type].name.toLowerCase()]){
            gemAnimationFrames[emotes[emote_type].name.toLowerCase()] = {}
            gemFlashFrames[emotes[emote_type].name.toLowerCase()] = {}
          }
          gemAnimationFrames[emotes[emote_type].name.toLowerCase()][name] = fullFrames
          gemFlashFrames[emotes[emote_type].name.toLowerCase()][name] = glimmerFrames
        }
      }
      animate();
      unserializeState();
      connect_websocket();
    });
  }

  // Animation Loop
  let start = 0;
  let accumulate = 0;
  var frameNumber = 0;

  function animate(t) {
    t = t || 0;
    var dt = t - start;

    accumulate += dt;

    var updates = 0;
    while (accumulate > 1 / 60 && updates < 3) {
      world.step(1 / 60);
      update(1 / 60, frameNumber++);

      accumulate -= 1 / 60;
      updates++;
    }

    if (getQueryParameter('physicsrender')) {
      debugRenderWorld(world, debugDrawGraphics);
    }

    start = t;
    requestAnimationFrame(animate);

    // Render scene
    renderer.render(stage);
  }

  // Gem State Serialization
  function serializeState() {
    var result = [];
    for (var i = 0; i < gems.length; i++) {
      var gem = gems[i];
      if (debug) console.log(gem);
      result.push({
        position: gem.physical.position,
        falling: gem.falling,
        velocity: gem.physical.velocity,
        mass: gem.physical.mass,
        angularVelocity: gem.physical.angularVelocity,
        angle: gem.physical.angle,
        tier: gem.tier,
        type: gem.type,
        depth: gem.renderable.depth,
        amount: gem.amount
      });
    }

    localStorage.setItem('gem_state', JSON.stringify({timestamp: Date.now(), result: result}));
  }

  function unserializeState() {
    var state = JSON.parse(localStorage.getItem('gem_state'));
    if (state === null || (Date.now() - state.timestamp) > 60000 || !state.timestamp) {
      return;
    }
    loadingScene = true;
    let arr = Array.isArray(state) ? state : state.result;
    for (var i = 0; i < arr.length; i++) {
      var old_gem = arr[i];
      // if (debug) console.log(old_gem);
      let amount = old_gem.amount;
      let type = old_gem.type;
      let getGemsize = setGemSize(amount, type);
      var gemShape = new p2.Circle({radius: getGemsize.radius, material: gemMaterial});
      var body = new p2.Body({
        mass: old_gem.mass,
        position: [old_gem.position[0], old_gem.position[1]],
        angularVelocity: old_gem.angularVelocity,
        velocity: [old_gem.velocity[0], old_gem.velocity[1]],
        angle: old_gem.angle,
        damping: 0.1,
        angularDamping: 0.1
      });

      body.addShape(gemShape);
      world.addBody(body);
      var gem = new PIXI.extras.MovieClip(gemFlashFrames[old_gem.type][old_gem.tier]);
      gem.animationSpeed = 24 / 60;
      // gem.gotoAndPlay(Math.floor(randomRange(0, gem.totalFrames)));

      gem.width += getGemsize.width;
      gem.height += getGemsize.width;
      let scale = getGemsize.radius * getGemsize.multiplier / (gem.width * scale_dampening);
      gem.scale = new PIXI.Point(scale, scale);
      
      gem.anchor.x = 0.5;
      gem.anchor.y = 0.5;
      gem.depth = old_gem.depth;
      gem.amount = old_gem.amount;
      gem.type = old_gem.type;
      gem.tier = old_gem.tier;
      
      container.addChild(gem);

      var res = new Gem(body, gem, 0, old_gem.tier, gem.depth, amount, type);
      res.falling = old_gem.falling;
      res.amount = old_gem.amount;
      res.type = old_gem.type;
      res.tier = old_gem.tier;
      

      gems.push(res);
    }
    loadingScene = false;
    needsDepthSort = true;
    messageID = arr.length + 1;
  }
  function connect_websocket(){
    const apiKey = 'jDHQkR4dMpOw6kL1IvhFEXW6w0K6KeQUf0S02XDwdiQQdzzxqmjpU27Jg58SNVMk';
    const socket = io.connect('https://ws.layerone.io', {
      query: `apikey=${apiKey}`
    });
    let connected = false;
    const layeroneId = 168;

    socket.on('connect', () => {
      if (debug) console.log("Connected to sockets");
      connected = true;
    });
    socket.on('disconnect', () => {
      if (debug) console.log("Disconnected from sockets");
      connected = false;
      attemptReconnect();
    });
    socket.on(`${layeroneId}.twitch.cheer`, (data) => {
      addAlert(data.payload.user.display_name || data.payload.user.username, data.payload.message.text, data.payload.message.emotes, data.payload.bits);
    });
    socket.on(`${layeroneId}.tip`, (data) => {
        let a = parseFloat(data.payload.amount);
        let p = a*100;
        addAlert(data.payload.username, "_tip_cheer_token_"+p, null, p);
    });
    socket.emit('subscribe', [`${layeroneId}.tip`, `${layeroneId}.twitch.cheer`]);
    function attemptReconnect() {
      if (!connected) {
        socket.io.reconnect();
        setTimeout(() => {
          attemptReconnect();
        }, 5000);
      }
    }
  }

  // Enable Debug mode ?debug=true
  if (debug) {
    console.log('%c' + ` ################ Debug Mode Started ################## `, 'color:white;background:#1976d2;font-weight:bold;');
    console.log(`
1. Key 1 - Single cheer1    
2. Key 2 - Multiple cheer1
3. Key 3 - Single cheer100 cheer1
4. Key 4 - Multiple cheer100 cheer500 cheer1
5. Key 5 - Single cheer10000
6. Space key will erase all bits active
         `);
    console.log('%c' + ` ###################################################### `, 'color:white;background:#1976d2;font-weight:bold;')
    body.on('keypress', function (k) {
      let charCode = k.which ? k.which : k.keyCode;
      let val = 0;

      let message = '';
      let emote = '';

      function randomEmote(){
        let arr = ['cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'cheer', 'kappa', 'muxy', 'kreygasm', 'swiftrage', 'streamlabs'];
        let r = Math.floor(Math.random() * arr.length-- + 1);
        if (arr[r] === undefined){
          return 'cheer';
        }
        return arr[r];
      }

      function randomName(){
        let arr = ['Booty', 'Deppception', 'Blackbeard', 'DivingBoard', 'AppleCider', 'ng222', 'WhyMeBoss', 'Gotothestore']
        let r = Math.floor(Math.random() * (arr.length - 1) + 1);
        return arr[r];
      }


      let name = randomName();
      switch (String.fromCharCode(charCode)) {
        case '1':
          val = 1;
          message = `${randomEmote()}1`;
          break;
        case '2':
          val = 100;
          message = `${randomEmote()}100`;

          break;
        case '3':
          val = 1000;
          message = `${randomEmote()}1000`;

          break;
        case '4':
          val = 5000;
          message = `${randomEmote()}5000`;

          break;
        case '5':
          val = 10000;
          message = `${randomEmote()}10000`;

          break;
        case '6':
          val = 4;
          message = `${randomEmote()}1 ${randomEmote()}1 ${randomEmote()}1 ${randomEmote()}1`;

          break;
        case '7':
          val = 10000;
          message = `burkeCheer10000 Oh look, super shiny`;

          break;
        case '8':
          val = 5001;
          message = `burkeCheer5000 burkeCheer1 Oh look, very shiny`;

          break;
        case '9':
          val = 1100;
          message = `burkeCheer100 burkeCheer1000 Oh look, shiny`;

          break;
        case 'y':
          serializeState();
          break;
        case '0':
          return rumbleChest();
        case ' ':
          clearAllGems();
          return;
        default:
          return;
      }

      // Trigger cannon if needed
      cannonVisible = true;
      cannonIsMoving = true;

      // Add message to alert queue (hook here)
      addAlert(name, message, emote, val);


    });

  }


  if (getQueryParameter("mute") === true) {
    muted = true;
  } else if (parseInt(getQueryParameter("mute")) > 0) {
    muteLessThan = parseInt(getQueryParameter("mute"));
  }

  if (getQueryParameter("freeshot")) {
    freeShot = true;
  }
  
  $(window).unload(function () {
    serializeState();
  });
  
  //init();
}); // End
