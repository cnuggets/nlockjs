# nlockjs
Node.js distributed lock based on Redis
## Getting Started
### Download
```
npm install nlockjs
```
### Usage
#### Redis lock
```
var Lock = require("nlockjs").Lock;

// New redis lock
var l = new Lock(15, {
    endpoints: "localhost:6379", // Redis endpoints
    password: ""                 // Redis password
});

// Lock
l.lock(key).then(function (ok) {
    // If has lock
    l.hasLock(key).then(function (yes) {
        assert.equal(yes, true);
        
        // Unlock
        l.unlock(key).then(function(ok) {
            assert.equal(ok, true);
        }, function(err) {
            console.error(err.toString());
        });
    }, function (err) {
        console.error(err.toString());
    });
}, function (err) {
    console.error(err.toString());
});

```
#### Lock with waiting time
```
// Lock waiting for 5 seconds
l.lockWait(key, 5).then(function (ok) {
    assert.equal(ok, true);
}, function (err) {
    console.error(err.toString());
});

```
### Methods
```
- lock(key)                       // lock
```
```
- lockWait(key, seconds)          // lock with waiting time
```
```
- isLocked(key)                   // check if locked
```
```
- hasLock(key)                    // check if has/own lock
```
```
- Unlock(key)                     // unlock
```

## License

nlockjs is under the MIT license. See the [LICENSE](LICENSE) for detail.