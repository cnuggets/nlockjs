var assert = require("assert");
var GenericContainer = require("testcontainers").GenericContainer;
var Lock = require("../lock").Lock;
var RedisClient = require("../lock").RedisClient;
describe("Distributed Lock", function () {
    var container;
    var redis;
    this.beforeAll(function () {
        return new GenericContainer("redis:6.2.6").withExposedPorts(6379).start().then(function (c) {
            container = c;
            redis = new RedisClient("localhost:" + container.getMappedPort(6379), "");
        }, function (err) {
            console.error(err.toString());
        });
    });

    describe("lock", function () {
        var key = "test"
        it("Access lock", function (done) {
            _lock1();
            setTimeout(function () {
                _lock2(done)
            }, 300);
        }).timeout(50000);

        function _lock1() {
            var l = new Lock(15, redis);
            // Lock
            l.lock(key).then(function (ok) {
                assert.equal(ok, true);
                // If has lock
                l.hasLock(key).then(function (yes) {
                    console.log("[lock1] access lock success");
                    assert.equal(yes, true);
                }, function (err) {
                    console.error(err.toString());
                });
                setTimeout(function () {
                    l.unlock(key).then(function(ok) {
                        assert.equal(ok, true);
                    }, function(err) {
                        console.error(err.toString());
                    });
                }, 5000);
            }, function (err) {
                console.error(err.toString());
            });
        }

        function _lock2(done) {
            var l = new Lock(15, redis);
            // Try to lock
            l.lock(key).then(function (ok) {
                console.log("[lock2] access lock failed");
                assert.equal(ok, false);

                // Try again
                l.lockWait(key, 3).then(function (ok) {
                    console.log("[lock2] access lock failed after waiting 3 seconds");
                    assert.equal(ok, false);
                }, function (err) {
                    console.error(err.toString());
                });

                // Waiting for lock1 release
                setTimeout(function () {
                    // Lock
                    l.lock(key).then(function (yes) {
                        console.log("[lock2] access lock success");
                        assert.equal(yes, true);

                        // Waiting for lock expired
                        setTimeout(function () {
                            l.hasLock(key).then(function (yes) {
                                console.log("[lock2] lock is expired");
                                assert.equal(yes, false);
                                done();
                            }, function (err) {
                                console.error(err.toString());
                            });
                        }, 16000);
                    }, function (err) {
                        console.error(err.toString());
                    });
                }, 5000);
            }, function (err) {
                console.error(err.toString());
            });
        }
    });

    this.afterAll(function () {
        redis.disconnect();
        container.stop();
    });
});