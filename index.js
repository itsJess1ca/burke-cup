"use strict";
//New Stuff
const _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

$(function () {

    //Play first alert on load
    const debug = true;

    let muted = true;

    // PIXI and P2
    let renderer, stage, container, world, debugDrawGraphics;


    // Active in scene
    let gems = [],
        messages = [];


    // Pending
    let queuedAlert = [];

    // Track message;
    let messageID = 0;
    let needsDepthSort = false;

    let needDepthSort = false;


    let gemAnimationFrames = {};
    var gemFlashFrames = {};
    let gemMaterial = new p2.Material();
    let chestMaterial = new p2.Material();


    // Globals
    const width = $('body').width();
    const height = $('body').height();


    // Chest width/height. Sprites will be scaled to fit this
    let chestWidth = 203;
    let chestHeight = 211;

    let chestPosition =  [width - 150, 0]; // Left side of the screen;
    let chestRadiusAdjust = 10;
    let chestRightAdjust = 5;
    let chestBottomHeight = 25;
    let chestSideLength = 150;
    let chestSideThickness = 10;

    let cannon;

    let MAXIMUM_TEXT_DISPLAY = 5;
    let TEXT_DISPLAY_START = height - 50;
    let GEM_DROP_POINT = chestPosition[0] + 35;
    let GEM_RADIUS = 12;

    stage = new PIXI.Container();

    function webGLDetect(return_context) {
        if (window.WebGLRenderingContext) {
            var canvas = document.createElement("canvas"),
                names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
                context = false;

            for (var i = 0; i < 4; i++) {
                try {
                    context = canvas.getContext(names[i]);
                    if (context && typeof context.getParameter === "function") {
                        // WebGL is enabled
                        if (return_context) {
                            // return WebGL object if the function's argument is present
                            return { name: names[i], gl: context };
                        }
                        // else, return just true
                        return true;
                    }
                } catch (e) {
                    console.log(e);
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
        let chestBottom = new p2.Body({
            position: [chestPosition[0],
                chestPosition[1] + chestBottomHeight + chestRadiusAdjust - 25]
        });
        chestBottom.addShape(new p2.Box({
            width: chestWidth,
            height: chestHeight,
            material: chestMaterial
        }));

        // Left
        let chestLeft = new p2.Body({
            position: [chestPosition[0] - chestWidth / 2 + chestRadiusAdjust,
                chestPosition[1] + chestRadiusAdjust]
        });
        chestLeft.addShape(new p2.Box({
            width: chestSideLength * 2,
            height: chestSideThickness,
            material: chestMaterial
        }));

        // Right
        let chestRight = new p2.Body({
            position: [chestPosition[0] + chestWidth / 2 - chestRadiusAdjust - chestRightAdjust,
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
        let chestBack = new PIXI.Sprite.fromImage('assets/images/trans_background.png');
        chestBack.position.x = chestPosition[0] - chestWidth / 2;
        chestBack.position.y = height - chestPosition[1] - chestHeight + 40;
        chestBack.height = chestHeight; // Need to set;
        chestBack.width = chestWidth; // Need to set

        stage.addChild(chestBack);
    }

    function addChestFront() {
        let chestFront = new PIXI.Sprite.fromImage('assets/images/trans_foreground.png');
        chestFront.position.x = chestPosition[0] - chestWidth / 2;
        chestFront.position.y = height - chestPosition[1] - chestHeight;
        chestFront.height = chestHeight; // Need to set;
        chestFront.width = chestWidth; // Need to set

        stage.addChild(chestFront);
    }

    function addCannon() {
        cannon = new PIXI.Sprite.fromImage('assets/images/cannon.png');
        cannon.height = 259;
        cannon.width = 118;
        cannon.position.x = 0;
        cannon.scale.y *= -1;
        cannon.position.y = height - chestPosition[1] - (chestHeight / 2) + 20;

        cannon.rotation = -1.7

        stage.addChild(cannon);
    }

    function moveCannon() {
        // Need to add proper movement
        cannon.position.x = cannon.width * 2 + 50
        setTimeout(function() {
            cannon.position.x = 0;
        },5000);
    }

    function randomRange(low, high) {
        return Math.random() * (high - low) + low;
    }

    function rotation(mag, rad) {
        return [Math.cos(rad) * mag, Math.sin(rad) * mag];
    }

    let Gem = function () {
        function Gem(physical, renderable, animationFrames, tier, amount) {
            _classCallCheck(this, Gem);

            this.physical = physical;
            this.renderable = renderable;

            // Set to true when the gem begins falling under the influence of gravity.
            this.falling = false;

            // This is roughly how many game frames it takes the gem animation to complete.
            this.startingGemAnimationGameFrames = animationFrames;

            // A counter to count frames until the gem animation is done.
            this.gemAnimationGameFrames = 0;

            this.tier = tier;

            this.amount = amount;
        }

        _createClass(Gem, [{
            key: "sync",
            value: function sync() {
                setPointFromPosition(this.renderable.position, this.physical.position);
                this.renderable.rotation = this.physical.angle;
            }
        }, {
            key: "updateAnimationFrames",
            value: function updateAnimationFrames() {
                if (this.gemAnimationGameFrames > 0) {
                    this.gemAnimationGameFrames--;
                    if (this.gemAnimationGameFrames === 0) {
                        container.removeChild(this.renderable);

                        // Transform this gem into a flashing gem.
                        var glimmerFrames = gemFlashFrames[this.tier];
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
            key: "update",
            value: function update(dt) {
                this.updateAnimationFrames();

                if (this.falling) {
                    // Die when the gem falls out of bounds.
                    if (this.physical.position[0] < 0 - GEM_RADIUS || this.physical.position[0] > width + GEM_RADIUS || this.physical.position[1] < 0 - GEM_RADIUS) {
                        this.dead = true;
                    }

                    if (this.falling && this.physical.position[1] < TEXT_DISPLAY_START - 40 * MAXIMUM_TEXT_DISPLAY && !this.hasRenderBody) {
                        var gemShape = new p2.Circle({ radius: GEM_RADIUS, material: gemMaterial });
                        this.physical.addShape(gemShape);
                        this.hasRenderBody = true;
                    }
                    if (this.physical.mass >= this.tier && this.physical.mass > 0) {
                        this.physical.mass = this.physical.mass - dt * this.tier;
                        this.physical.updateMassProperties();
                    }
                } else {
                    // Update the position, and then turn on physics when we hit the rim of the cup.
                    this.physical.position[0] -= dt * 100;

                    // Start playing the animation and sound when the gem is on screen.
                    if (this.physical.position[0] < width && this.gemAnimationGameFrames === 0 && this.falling === false) {
                        this.gemAnimationGameFrames = this.startingGemAnimationGameFrames;
                        this.renderable.gotoAndPlay(0);

                        if (!muted && this.amount >= muteLessThan) {
                            var sfx = $(".js-gem-sound-" + this.tier).clone()[0];
                            if (this.amount < 100) {
                                sfx.volume = 0.05;
                            } else {
                                sfx.volume = 0.15;
                            }
                            sfx.play();
                        }
                    }

                    // Once it reaches the drop point, let physics happen.
                    if (this.physical.position[0] < GEM_DROP_POINT && this.falling === false) {
                        //this.physical.mass = Math.round(this.amount * Math.sqrt(this.tier));
                        this.physical.mass = 1;
                        this.physical.damping = 0.01;
                        this.physical.angularDamping = 0.1;
                        this.physical.type = p2.Body.DYNAMIC;
                        this.physical.velocity = rotation(randomRange(10, 50), randomRange(0, Math.PI / 2) + Math.PI / 2);
                        this.physical.updateMassProperties();
                        this.falling = true;
                        if (this.physical.amount >= 999) {
                            this.physical.mass = this.physical.mass * 100;
                            this.physical.updateMassProperties();
                        }
                    }
                }
            }
        }, {
            key: "destroy",
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
            key: "update",
            value: function update(dt) {
                for (var i = 0; i < this.renderables.length; ++i) {
                    this.renderables[i].position.x -= dt * 100;
                }

                // Kill this object when the last member goes offscreen.
                var last = this.renderables[this.renderables.length - 1];
                if (last.width + last.position.x < 0) {
                    this.dead = true;
                }
            }
        }, {
            key: "destroy",
            value: function destroy() {
                _.each(this.renderables, function (r) {
                    container.removeChild(r);
                    r.destroy();
                });
            }
        }]);

        return ScrollingText;
    }();

    function addGem(x, y, tier, depth, amount) {
        // Add a box
        var body = new p2.Body({
            mass: 0,
            position: [x, y - GEM_RADIUS],
            angularVelocity: -1
        });

        world.addBody(body);

        var animationFrames = gemAnimationFrames[tier];
        var gem = new PIXI.extras.MovieClip(animationFrames);
        gem.animationSpeed = 24 / 60;
        gem.play();
        gem.anchor.x = 0.5;
        gem.anchor.y = 0.5;

        // The gems are slightly larger than the collision body, so overlaps will happen.
        gem.scale = new PIXI.Point(GEM_RADIUS * 4 / gem.width, GEM_RADIUS * 4 / gem.width);
        gem.depth = depth;

        // The scaling factor of 60 / 24 * 3 was experimentally derived.
        var gemMovieGameFrames = Math.ceil(gem.totalFrames * 60 / 24 * 3);

        // Add the box to our container
        container.addChild(gem);

        var res = new Gem(body, gem, gemMovieGameFrames, tier, amount);
        gems.push(res);

        needsDepthSort = true;
        return res;
    }


    function addAlert(user, msg, emotes, bits) {
        queuedAlert.push({
            user: user,
            message: msg,
            emotes: emotes,
            bits: bits
        });
        console.log(queuedAlert);
    }

    function getPointsThreshold(amount) {
        // Points threshold.
        var threshold = 1;
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

    function createText() {
        let i, j;

        // Return if nothing queued
        if (queuedAlert.length === 0) return;

        // Find an open lane.
        var exists = {};
        for (i = 0; i < messages.length; ++i) {
            exists[messages[i].rank] = 1;
        }

        var nextRank = undefined;
        for (i = 0; i < MAXIMUM_TEXT_DISPLAY; ++i) {
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
        text.emotes = text.emotes || "";
        if (text.emotes !== "") {
            let emotes = text.emotes.split("/");
            for (i = 0; i < emotes.length; ++i) {
                // Invert this index, turning it into starting-char -> emote id, length.
                let data = emotes[i];
                let idSplit = data.split(":");
                let values = idSplit[1].split(",");

                // Turn the values into integer pairs of start and ending points.
                let _indices = _.map(values, function (v) {
                    let indices = v.split("-");
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
            return msg.substr(0, b) + "\x01" + msg.substr(e + 1);
        };

        let message = text.message;
        for (i = 0; i < emoteListing.length; ++i) {
            let range = emoteListing[i];
            message = replaceRange(message, range.indices[0], range.indices[1]);
        }

        // Split on 0x01, which gives us a set of messages seperated by emotes.
        let splitMessage = message.split("\x01");
        let givepointsRegex = /(?:^|\s)cheer(\d+)(?=$|\s)/g;
        let amountRegex = /(?:^|\s)cheer(\d+)(?=$|\s)/;

        // Begin assembling the {prefix, emote} table.
        let messageTable = [];
        let forwardEmoteListing = emoteListing.reverse();

        // At the end there is a sentinel '0' emote, which is no emote.
        forwardEmoteListing.push({
            id: "0"
        });

        let total = 0;
        let expected = text.bits;

        // At this point, splitMessage is a list of text fragments. Between each fragment is an emote.
        for (i = 0; i < splitMessage.length; ++i) {
            let part = splitMessage[i];

            // Then, look for givepoints objects
            let matches = part.match(givepointsRegex);
            let splits = part.replace(givepointsRegex, "\x01").split("\x01");

            // Splits is now a list of text fragments, between each of which is a givepoints command.
            for (j = 0; j < splits.length - 1; ++j) {
                let matchResults = matches[j].match(amountRegex);
                let amount = parseInt(matchResults[1], 10);

                if (total + amount > expected) {
                    // Skip this one, as it exceeds the number of bits in the message.
                    messageTable.push({
                        prefix: splits[j].trim() + matches[j],
                        emote: { id: "0" }
                    });
                } else {
                    // Push each fragment, with a gem afterwards.
                    messageTable.push({
                        prefix: splits[j].trim(),
                        emote: { id: "-1" },
                        amount: amount
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
        messageTable[0].prefix = text.username + ": " + messageTable[0].prefix;

        // Begin constructing the display objects.
        let resultingTextObjects = [];
        let properties = { font: '24px Arial', fill: 0xFFFFFF, stroke: 0x000000, strokeThickness: 5, align: 'left', lineJoin: "round" };
        let currentOffset = width + 100;
        let textHeight = TEXT_DISPLAY_START - 40 *nextRank;

        for (i = 0; i < messageTable.length; ++i) {
            let msg = messageTable[i];

            // If there is a non-empty prefix, generate a text object.
            if (msg.prefix.length !== 0) {
                let textDisplay = new PIXI.Text(msg.prefix, properties);
                textDisplay.scale = new PIXI.Point(1, -1);
                textDisplay.position = new PIXI.Point(currentOffset, textHeight);

                container.addChild(textDisplay);
                currentOffset += textDisplay.width;
                resultingTextObjects.push(textDisplay);
            }

            if (msg.emote.id === "-1") {
                // If the emote is a gem, add a gem.
                let tier = getPointsThreshold(msg.amount);
                addGem(currentOffset + 5, textHeight, tier, messageID * 10000 + tier + i, msg.amount);
                currentOffset += GEM_RADIUS * 2 + 10;
            } else if (msg.emote.id === "0") {
                // Do nothing.
            } else {
                // This is an emote, construct a sprite.
                let emoteDisplay = new PIXI.Sprite.fromImage('/points/emote/' + msg.emote.id);
                emoteDisplay.scale = new PIXI.Point(1, -1);

                // These pixel adjustments were experimentally derived.
                emoteDisplay.position = new PIXI.Point(currentOffset + 5, textHeight);
                currentOffset += 38;

                container.addChild(emoteDisplay);
                resultingTextObjects.push(emoteDisplay);
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
    }

    function setPointFromPosition(point, position) {
        point.x = position[0];
        point.y = position[1];
    }

    function update(dt) {
        if(needDepthSort){
            container.children.sort(depthSort);
            needDepthSort = false;
        }

        gems = _.filter(gems, function(g) {
            if(g.dead){
                g.destroy();
            }
            return !g.dead;
        });

        for(let i = 0; i < gems.length; i++){
            gems[i].update(dt);
            gems[i].sync();
        }

        messages = _.filter(messages, function(t){
            if(t.dead) {
                t.destroy();
            }
            return !t.dead;
        });

        if(messages.length < MAXIMUM_TEXT_DISPLAY){
            createText();
        }

        for(let i = 0; i < messages.length; i++){
            messages[i].update(dt);
        }

    }



    function init() {

        world = new p2.World({
            gravity: [0, -98.20]
        });

        world.addContactMaterial(new p2.ContactMaterial(gemMaterial, gemMaterial, { relaxation: 0.8, friction: 0, restitution: 0.2, stiffness: p2.Equation.DEFAULT_STIFFNESS * 100 }));
        world.addContactMaterial(new p2.ContactMaterial(gemMaterial, chestMaterial, { relaxation: 0.8, friction: 0, restitution: 0.2, stiffness: Number.MAX_VALUE }));

        addBoundingBox();


        // Initialize the stage
        if(webGLDetect()) {
            renderer = new PIXI.WebGLRenderer(width, height, { transparent: true });
        } else {
            renderer = new PIXI.CanvasRenderer(width, height, { transparent: true });
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

        PIXI.loader.add("assets/images/point-sprites/1-quarter.json").add("assets/images/point-sprites/100-quarter.json").add("assets/images/point-sprites/1000-quarter.json").add("assets/images/point-sprites/5000-quarter.json").add("assets/images/point-sprites/10000-quarter.json").load(function () {
            var breakPoints = [1, 100, 1000, 5000, 10000];
            var glimmerStart = [43, 43, 43, 43, 43];
            var frames = [64, 64, 64, 64, 73];

            var frameName = function frameName(name, i) {
                var frameID = "" + i;
                if (i < 10) {
                    frameID = "0" + i;
                }

                return name + "_000" + frameID;
            };

            for (var movie = 0; movie < breakPoints.length; ++movie) {
                var name = breakPoints[movie];
                var frameCount = frames[movie];
                var glimmerStartFrame = glimmerStart[movie];

                var fullFrames = [];
                for (var i = 0; i < frameCount; ++i) {
                    fullFrames.push(PIXI.Texture.fromFrame(frameName(name, i)));
                }

                var glimmerFrames = [];
                for (i = glimmerStartFrame; i < frameCount; ++i) {
                    glimmerFrames.push(PIXI.Texture.fromFrame(frameName(name, i)));
                }

                // Add in like, 2 seconds of blankness.
                for (i = 0; i < 150; ++i) {
                    glimmerFrames.push(PIXI.Texture.fromFrame(frameName(name, frameCount - 1)));
                }

                gemAnimationFrames[name] = fullFrames;
                gemFlashFrames[name] = glimmerFrames;
            }

            animate();
            unserializeState();
        });

        if(debug){
            moveCannon();
            // Send to test alert
            addAlert('TestUser', `Demo message for champions cheer1`, "", '1');
        }

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

        if (getQueryParameter("physicsrender")) {
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
        for (var i = 0; i < gems.length; ++i) {
            var gem = gems[i];
            result.push({
                position: gem.physical.position,
                falling: gem.falling,
                velocity: gem.physical.velocity,
                mass: gem.physical.mass,
                angularVelocity: gem.physical.angularVelocity,
                angle: gem.physical.angle,
                tier: gem.tier,
                depth: gem.renderable.depth
            });
        }

        localStorage.setItem("gem_state", JSON.stringify(result));
    }

    function unserializeState() {
        var state = JSON.parse(localStorage.getItem("gem_state"));
        if (state === null) {
            return;
        }

        for (var i = 0; i < state.length; ++i) {
            var data = state[i];

            var gemShape = new p2.Circle({ radius: GEM_RADIUS, material: gemMaterial });
            var body = new p2.Body({
                mass: data.mass,
                position: [data.position[0], data.position[1]],
                angularVelocity: data.angularVelocity,
                velocity: [data.velocity[0], data.velocity[1]],
                angle: data.angle,
                damping: 0.1,
                angularDamping: 0.1
            });

            body.addShape(gemShape);
            world.addBody(body);

            var gem = new PIXI.extras.MovieClip(gemFlashFrames[data.tier]);
            gem.animationSpeed = 24 / 60;
            gem.gotoAndPlay(Math.floor(randomRange(0, gem.totalFrames)));
            gem.scale = new PIXI.Point(GEM_RADIUS * 4 / gem.width, GEM_RADIUS * 4 / gem.width);
            gem.anchor.x = 0.5;
            gem.anchor.y = 0.5;
            gem.depth = data.depth;

            container.addChild(gem);

            var res = new Gem(body, gem, 0, data.tier, data.depth, data.amount);
            res.falling = data.falling;

            gems.push(res);
        }

        needsDepthSort = true;
        messageID = state.length + 1;
    }

    // Look for any parameters
    let getQueryParameter = function getQueryParameter(p) {
        let urlHashes = window.location.href.slice(window.location.href.indexOf("?") + 1).split("&");
        for (var i = 0; i < urlHashes.length; i++) {
            var hash = urlHashes[i].split("=");
            if (hash[0] === p) {
                return hash[1] || true;
            }
        }
    };

    // Enable Debug mode ?debug=true
    if(getQueryParameter("debug")){
        console.log("%c" + ` ################ Debug Mode Started ################## `, "color:white;background:#1976d2;font-weight:bold;")
        console.log(`
1. Keys 1 - 5 will activate the different gem drops
2. Keys 6 - 0 will activate the different emote drops
3. Space key will erase all bits active
         `);
        console.log("%c" + ` ###################################################### `, "color:white;background:#1976d2;font-weight:bold;")
        $('body').on('keypress', function(k){
            let charCode = k.which ? k.which : k.keyCode;
            let val = 5;

            switch (String.fromCharCode(charCode)){
                case '1':
                    val = 1;
                    break;
                case '2':
                    val = 101;
                    break;
                case '3':
                    val = 1001;
                    break;
                case '4':
                    val = 5240;
                    break;
                case '5':
                    val = 10000;
                    break;
                case ' ':
                    clearAllGems();
                    return;
                default:
                    return;
            }

            moveCannon();
            // Send to test alert
            addAlert('TestUser', `Demo message for champions cheer${val}`, "", val);

        });

    }




    init();
}); // End
