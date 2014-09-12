Straight IO
===========

A socket.io framework, using the idea of middleware, to make sequential processing more easily.

WARNING: This framework need to patch `Socket` object in `socket.io/lib/socket`, so use it carefully.

Installation & Test
------------

```
npm install && npm test
```

Example
-----------

```javascript

var Straight = require("straight-io");
var straight = new Straight();
var io = require("socket.io")(80);

// pass patch name, or straight will use default name(`register`)
var forceToOverwrite = true;
straight.patch("myPatchMethodName", forceToOverwrite);

// before hooks
straight.before(function (socket, req, next) {
  var id = socket.id;
  getSession(id, function (error, session) {
    if (error) {
      next(error);
    } else {
      req.session = session;
      next();
    }
  });
});

// after hooks
straight.after(function (socket, req, next) {
  console.log("socket[" + socket.id + "] call event: ", req.event);
  next();
});

// error handler
straight.error(function (error, socket, req) {
  console.log(error instanceof Error); // true
  socket.emit("server-error", { event: req.event, error: error.message });
});

io.on("connection", function (socket) {

  // use original method
  socket.on("my event", function (data1, data2) {
  });

  // use patch
  socket.myPatchMethodName("event name",

    function (socket, req, next) {
      console.log(req.event); // event name
      console.log(req.data);  // ["hello", "world"], if we call from client side: client.emit("event name", "hello", "world")
      next();                 // skip to next middleware
    },

    function (socket, req, next) {
      socket.emit("some event", "still same as before");
    }
  );
});

```
