var Straight = module.exports = function () {
  // global hooks
  this.beforeHooks = [];
  this.afterHooks  = [];

  // default error handler
  this.errorHandler = function (error, socket, req) {
    console.error(error);
  };

  // default patch name
  this.defaultPatch = "register";
};

Straight.prototype.patch = function (custom, force) {
  var Socket   = require("socket.io/lib/socket");
  var proto    = Socket.prototype;
  var straight = this;
  var field    = custom || straight.defaultPatch;

  // throw error when field exists and not force it to overwrite
  if (proto[field] !== undefined && force !== true) {
    throw new Error("Socket.prototype." + field + " exists.");
  }

  // Patch Socket.prototype
  Socket.prototype.__defineGetter__(field, function () {
    var socket = this;
    var errorHandler = straight.errorHandler;
    var before = straight.beforeHooks;
    var after  = straight.afterHooks;

    function patchFunction(event) {
      var stack = Array.prototype.slice.call(arguments, 1);
      // import global before functions
      stack = before.concat(stack).concat(after);
      var listener = function () {
        // reset index every time
        var index = 0;
        // define request object
        var req  = {};
        var args = Array.prototype.slice.call(arguments);
        var ack  = args[args - 1];
        req.event = event;
        req.ack   = typeof ack === "function" ? ack : null;
        req.data  = req.ack ? args.slice(0, -1) : args;

        // define next function
        var next = function (error) {
          var middleware = stack[index++];
          if (error) {
            error = error instanceof Error ? error : new Error(error);
            return errorHandler(error, socket, req);
          } else {
            if (!middleware) {
              next("No Middleware!");
            } else if (typeof middleware !== "function") {
              next();
            } else {
              middleware(socket, req, next);
            }
          }
        };
        next();
      };
      socket.on(event, listener);
    }
    return patchFunction;
  });
  return this;
};

Straight.prototype.before = function (handler) {
  this.beforeHooks.push(handler);
  return this;
};

Straight.prototype.after  = function (handler) {
  this.afterHooks.push(handler);
  return this;
};

Straight.prototype.error  = function (errorHandler) {
  this.errorHandler = errorHandler;
  return this;
};
