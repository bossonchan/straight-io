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
      var handlers = Array.prototype.slice.call(arguments, 1);

      for (var i = 0, len = handlers.length; i < len; i++) {
        var handler = handlers[i];
        if (typeof handler !== "function") throw new Error("middleware should be a function");
      }

      // import global before functions
      var listener = function () {
        // reset index and stack every time
        var index = 0;
        var stack = before.concat(handlers).concat(after);

        // define request object
        var req  = {};
        var args = Array.prototype.slice.call(arguments);
        var ack  = args[args.length - 1];
        req.event = event;
        req.ack   = typeof ack === "function" ? ack : null;
        req.data  = req.ack ? args.slice(0, -1) : args;

        // define next function
        var next = function (error) {
          if (error) {
            error = error instanceof Error ? error : new Error(error);
            return errorHandler(error, socket, req);
          }

          var middleware = stack[index++];
          if (!middleware) {
            next("No Middleware!");
          } else {
            middleware(socket, req, canCallOnlyOneTime(next));
          }
        };

        function canCallOnlyOneTime(fn) {
          var isCalled = false;
          return function () {
            if (isCalled) {
            } else {
              isCalled = true;
              fn.apply(null, arguments);
            }
          };
        }

        next();
      };
      socket.on(event, listener);
    }
    return patchFunction;
  });
  return this;
};

Straight.prototype.before = function (handler) {
  if (typeof handler !== "function") throw new Error("middleware should be a function");
  this.beforeHooks.push(handler);
  return this;
};

Straight.prototype.after  = function (handler) {
  if (typeof handler !== "function") throw new Error("middleware should be a function");
  this.afterHooks.push(handler);
  return this;
};

Straight.prototype.error  = function (errorHandler) {
  if (typeof errorHandler !== "function") throw new Error("errorHandler should be a function");
  this.errorHandler = errorHandler;
  return this;
};
