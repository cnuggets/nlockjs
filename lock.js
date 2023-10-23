var Redis = require("ioredis");
var uuid = require("node-uuid");

exports = module.exports = {
    Lock: Lock,
    RedisClient: RedisClient
};

function Lock(ttl, redis) {
    if (redis.endpoints && redis.password != undefined) {
        redis = new RedisClient(redis.endpoints, redis.password, function (err) {
            console.error(err.toString());
        });
    }
    var PREFIX = "nlock:";
    var id = _id();

    function _lock(key) {
        return new Promise(function (resolve, reject) {
            redis.set(_key(key), id, "EX", ttl, "NX", function (err, result) {
                if (err) {
                    reject();
                } else {
                    if (result) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    }

    function _lockWait(key, seconds) {
        var isTimeout = false;
        var timer = setTimeout(function () {
            isTimeout = true;
        }, seconds * 1000);
        return new Promise(function (resolve, reject) {
            _do(function (err, ok) {
                clearTimeout(timer);
                if (err) {
                    reject(err);
                } else {
                    resolve(ok);
                }
            });
        });

        function _do(callback) {
            if (isTimeout) {
                _lock(key).then(function (ok) {
                    callback(null, ok);
                }, function (err) {
                    callback(err);
                });
                return
            }

            _lock(key).then(function (ok) {
                if (ok) {
                    callback(null, true);
                } else {
                    setTimeout(function () {
                        _do(callback);
                    }, 400);
                }
            }, function (err) {
                callback(err);
            });
        }
    }

    function _unlock(key) {
        return new Promise(function (resolve, reject) {
            _hasLock(key).then(function (yes) {
                if (yes) {
                    redis.del(_key(key), function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            if (result) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        }
                    });
                } else {
                    resolve(false);
                }
            }, function (err) {
                reject(err);
            });
        });
    }

    function _isLocked(key) {
        return new Promise(function (resolve, reject) {
            redis.get(_key(key), function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    if (result) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    }

    function _hasLock(key) {
        return new Promise(function (resolve, reject) {
            redis.get(_key(key), function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result == id);
                }
            });
        });
    }

    function _close() {
        redis.disconnect();
    }

    function _key(key) {
        return PREFIX + key;
    }

    function _id() {
        return uuid.v1().toLowerCase().replace(new RegExp("\\-", "gm"), "");
    }

    return {
        lock: _lock,
        lockWait: _lockWait,
        unlock: _unlock,
        isLocked: _isLocked,
        hasLock: _hasLock,
        close: _close
    }
}

function RedisClient(endpoints, password, onError) {
    if (!Array.isArray(endpoints)) {
        endpoints = [endpoints];
    }
    var client;
    if (endpoints.length == 1) {
        var pair = endpoints[0].split(":");
        var options = {
            port: pair[1],
            host: pair[0],
            password: password,
            lazyConnect: true
        }
        client = new Redis(options);
        client.on("error", function (err) {
            if (onError) {
                onError(err);
            }
        });
    } else {
        var connection = [];
        for (var i = 0; i < endpoints.length; i++) {
            var pair = endpoints[i].split(":");
            connection.push({
                port: pair[1],
                host: pair[0]
            });
        }
        client = new Redis.Cluster(connection, {
            redisOptions: {
                password: password,
            },
        });
        client.on("error", function (err) {
            if (onError) {
                onError(err);
            }
        });
    }

    return client;
}