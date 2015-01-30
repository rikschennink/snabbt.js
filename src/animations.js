var snabbtjs = snabbtjs || {};

// ------------------------------
// Time animation
// ------------------------------

snabbtjs.Animation = function(options) {
  var optionOrDefault = snabbtjs.optionOrDefault;
  this.startState = options.startState;
  this.endState = options.endState;
  this.duration = optionOrDefault(options.duration, 500);
  this.delay = optionOrDefault(options.delay, 0);
  this.perspective = options.perspective;
  this.easing = snabbtjs.createEaser(optionOrDefault(options.easing, 'linear'), options);
  this.currentState = this.startState.clone();
  this.transformOrigin = options.transformOrigin;
  this.currentState.transformOrigin = options.transformOrigin;

  this.startTime = 0;
  this.currentTime = 0;
  this.stopped = false;

  // Manual
  this.manual = options.manual;
  this.value = 0;
};

snabbtjs.Animation.prototype.stop = function() {
  this.stopped = true;
};

snabbtjs.Animation.prototype.isStopped = function() {
  return this.stopped;
};

snabbtjs.Animation.prototype.finish = function(callback) {
  this.manual = false;
  var duration = this.duration * this.value;
  this.startTime = this.currentTime - duration;
};

snabbtjs.Animation.prototype.rollback = function(callback) {
  this.manual = false;
  var duration = this.duration * (1 - this.value);
  this.startTime = this.currentTime - duration;
  var oldStart = this.startState;
  this.startState = this.endState;
  this.endState = oldStart;
};

snabbtjs.Animation.prototype.restart = function() {
  // Restart timer
  this.startTime = undefined;
};

snabbtjs.Animation.prototype.tick = function(time) {
  if(this.stopped)
    return;
  if(this.manual) {
    this.currentTime = time;
    this.easing.tick(this.value);
    this.updateCurrentTransform();
    return;
  }

  // If first tick, set start_time
  if(!this.startTime) {
    this.startTime = time;
  }
  if(time - this.startTime > this.delay)
    this.currentTime = time - this.delay;

  var curr = Math.min(Math.max(0.0, this.currentTime - this.startTime), this.duration);
  this.easing.tick(curr/this.duration);
  this.updateCurrentTransform();
};

snabbtjs.Animation.prototype.getCurrentState = function() {
  return this.currentState;
};

snabbtjs.Animation.prototype.setValue = function(value) {
  this.value = value;
};

snabbtjs.Animation.prototype.updateCurrentTransform = function() {
  var tweenValue = this.easing.value();
  snabbtjs.TweenStates(this.startState, this.endState, this.currentState, tweenValue);
};

snabbtjs.Animation.prototype.completed = function() {
  if(this.stopped)
    return true;
  if(this.startTime === 0) {
    return false;
  }
  return this.easing.completed();
};

snabbtjs.Animation.prototype.updateElement = function(element) {
  var matrix = this.currentState.asMatrix();
  var properties = this.currentState.properties();
  snabbtjs.setTransformOrigin(element, this.transformOrigin);
  snabbtjs.updateElementTransform(element, matrix, this.perspective);
  snabbtjs.updateElementProperties(element, properties);
};

// ------------------------------
// End Time animation
// ------------------------------

// ------------------------------
// Value feeded animation
// ------------------------------

snabbtjs.ValueFeededAnimation = function(options) {
  this.valueFeeder = options.valueFeeder;
  this.duration = options.duration || 500;
  this.delay = options.delay || 0;
  this.perspective = options.perspective;

  this.easing = snabbtjs.createEaser('linear');
  if(options.easing)
    this.easing = snabbtjs.createEaser(options.easing, options);
  this.currentState = new snabbtjs.State({});
  this.currentMatrix = this.valueFeeder(0, new snabbtjs.Matrix());
  this.transformOrigin = options.transformOrigin;

  this.startTime = 0;
  this.currentTime = 0;
  this.stopped = false;
};

snabbtjs.ValueFeededAnimation.prototype.stop = function() {
  this.stopped = true;
};

snabbtjs.ValueFeededAnimation.prototype.isStopped = function() {
  return this.stopped;
};

snabbtjs.ValueFeededAnimation.prototype.tick = function(time) {
  if(this.stopped)
    return;

  // If first tick, set start_time
  if(!this.startTime)
    this.startTime = time;
  if(time - this.startTime > this.delay)
    this.currentTime = time - this.delay;

  var curr = Math.min(Math.max(0.001, this.currentTime - this.startTime), this.duration);
  this.easing.tick(curr/this.duration);

  this.updateCurrentTransform();
};

snabbtjs.ValueFeededAnimation.prototype.getCurrentState = function() {
  return this.currentState;
};

snabbtjs.ValueFeededAnimation.prototype.updateCurrentTransform = function() {
  var tweenValue = this.easing.value();
  var currentMatrix = this.currentMatrix;
  currentMatrix.clear();
  this.currentMatrix = this.valueFeeder(tweenValue, currentMatrix);
};

snabbtjs.ValueFeededAnimation.prototype.completed = function() {
  if(this.stopped)
    return true;
  return this.easing.completed();
};

snabbtjs.ValueFeededAnimation.prototype.updateElement = function(element) {
  snabbtjs.setTransformOrigin(element, this.transformOrigin);
  snabbtjs.updateElementTransform(element, this.currentMatrix.data, this.perspective);
};

// ------------------------------
// End value feeded animation
// ------------------------------

// ------------------------
// -- AttentionAnimation --
// ------------------------

snabbtjs.AttentionAnimation = function(options) {
  this.movement = options.movement;
  this.currentMovement = new snabbtjs.State({});
  options.initialVelocity = 0.1;
  options.equilibriumPosition = 0;
  this.spring = new snabbtjs.SpringEasing(options);
  this.stopped = false;
  this.options = options;
};

snabbtjs.AttentionAnimation.prototype.stop = function() {
  this.stopped = true;
};

snabbtjs.AttentionAnimation.prototype.isStopped = function(time) {
  return this.stopped;
};

snabbtjs.AttentionAnimation.prototype.tick = function(time) {
  var spring = this.spring;
  if(this.stopped)
    return;
  if(spring.equilibrium)
    return;
  spring.tick();

  this.updateMovement();
};

snabbtjs.AttentionAnimation.prototype.updateMovement = function() {
  var currentMovement = this.currentMovement;
  var movement = this.movement;
  var position = this.spring.position;
  currentMovement.position[0] = movement.position[0] * position;
  currentMovement.position[1] = movement.position[1] * position;
  currentMovement.position[2] = movement.position[2] * position;
  currentMovement.rotation[0] = movement.rotation[0] * position;
  currentMovement.rotation[1] = movement.rotation[1] * position;
  currentMovement.rotation[2] = movement.rotation[2] * position;
  currentMovement.rotationPost[0] = movement.rotationPost[0] * position;
  currentMovement.rotationPost[1] = movement.rotationPost[1] * position;
  currentMovement.rotationPost[2] = movement.rotationPost[2] * position;
  if(movement.scale[0] !== 1 && movement.scale[1] !== 1) {
    currentMovement.scale[0] = 1 + movement.scale[0] * position;
    currentMovement.scale[1] = 1 + movement.scale[1] * position;
  }

  currentMovement.skew[0] = movement.skew[0] * position;
  currentMovement.skew[1] = movement.skew[1] * position;
};

snabbtjs.AttentionAnimation.prototype.updateElement = function(element) {
  var currentMovement = this.currentMovement;
  var matrix = currentMovement.asMatrix();
  var properties = currentMovement.properties();
  snabbtjs.updateElementTransform(element, matrix);
  snabbtjs.updateElementProperties(element, properties);
};

snabbtjs.AttentionAnimation.prototype.getCurrentState = function() {
  return this.currentMovement;
};

snabbtjs.AttentionAnimation.prototype.completed = function() {
  return this.spring.equilibrium || this.stopped;
};

snabbtjs.AttentionAnimation.prototype.restart = function() {
  // Restart spring
  this.spring = new snabbtjs.SpringEasing(this.options);
};

// Returns animation constructors based on options
snabbtjs.createAnimation = function(options) {
  if(options.valueFeeder)
    return new snabbtjs.ValueFeededAnimation(options);
  return new snabbtjs.Animation(options);
};
