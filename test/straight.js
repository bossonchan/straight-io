describe("Straight IO", function () {
  var should = require("should");
  var Straight = require("../");
  var straight = new Straight();
  var count = 0;
  straight.patch();

  function getServerAndClient() {
    var port = 9999 + (count++);
    return {
      io:  require("socket.io")(port),
      cio: require("socket.io-client")("http://localhost:" + port)
    };
  }

  describe("patch", function () {
    it("should patch `Socket.prototype` successfully", function (done) {
      var pair = getServerAndClient();
      pair.io.on("connection", function (socket) {
        socket.should.have.property("register");
        socket.register.should.be.a.Function;
        done();
      });
    });

    it("should register event in new way successfully", function (done) {
      var pair = getServerAndClient();
      pair.io.on("connection", function (socket) {
        socket.register("for test with ack", function (socket, req, next) {
          req.should.have.property("event", "for test with ack");
          req.should.have.property("ack");
          req.ack.should.be.a.Function;
          req.ack(); // trigger next event

          socket.register("for test", function (socket, req, next) {
            req.should.have.property("event", "for test");
            req.should.have.property("ack", null);
            req.should.have.property("data", ["test message"]);
            next.should.be.Function;
            done();
          });

        });
      });
      pair.cio.emit("for test with ack", function () {
        pair.cio.emit("for test", "test message");
      });
    });
  });

  describe("before, after, error", function () {
    it("should register global before hooks using `before` method", function (done) {
      var pair = getServerAndClient();
      var straight = new Straight();
      straight.patch("listenEvent", true);
      straight.before(function (socket, req, next) {
        req.should.have.property("event", "test before");
        req.should.have.property("data", []);
        done();
      });
      pair.io.on("connection", function (socket) {
        socket.listenEvent("test before");
      });
      pair.cio.emit("test before");
    });

    it("should register global after hooks using `after` method", function (done) {
      var pair = getServerAndClient();
      var straight = new Straight();
      straight.patch("listenEvent", true);
      straight.after(function (socket, req, next) {
        req.should.have.property("event", "test after");
        req.should.have.property("data", []);
        done();
      });
      pair.io.on("connection", function (socket) {
        socket.listenEvent("test after");
      });
      pair.cio.emit("test after");
    });

    it("should overwrite error handler using `error` method", function (done) {
      var pair = getServerAndClient();
      var straight = new Straight();
      straight.patch("listenEvent", true);
      straight.error(function (error, socket, req) {
        error.should.be.an.Error;
        error.message.should.eql("something wrong");
        done();
      });
      pair.io.on("connection", function (socket) {
        socket.listenEvent("test error handler", function (socket, req, next) {
          next("something wrong");
        });
      });
      pair.cio.emit("test error handler");
    });
  });
});
