var assert = require('assert'),
  oneoff = require('../lib/oneoff.js')

describe('oneoff', function(){
  it('should return an error on empty task lists', function(done){
    oneoff.run([], function (err) {
      assert.ok(err instanceof Error)
      done()
    })
  }),
  it('should return an error when task missing name property', function (done) {
    var tasks = [ { done: true, task: true} ]
    oneoff.run(tasks, function (err) {
      assert.ok(err instanceof Error)
      assert.ok(err.message.match(/name/))
      done()
    })
  })
  it('should return an error when task missing done property', function (done) {
    var tasks = [ { name: true, task: true} ]
    oneoff.run(tasks, function (err) {
      assert.ok(err instanceof Error)
      assert.ok(err.message.match(/done/))
      done()
    })
  })
  it('should return an error when task missing task property', function (done) {
    var tasks = [ { done: true, name: true} ]
    oneoff.run(tasks, function (err) {
      assert.ok(err instanceof Error)
      assert.ok(err.message.match(/task/))
      done()
    })
  })
  describe('should run tasks as instance zero', function () {
    oneoff.instance_zero = true

    it('should run tasks with no order concurrently', function (_done) {
      var called = 0
      var done = function (cb) {
        return cb(null, called === 4)
      }

      var task = function (cb) {
        setTimeout(cb, 100)
        called++
      }

      var tasks = [ 
        { name: 1, done: done, task: task}, 
        { name: 2, done: done, task: task}, 
        { name: 3, done: done, task: task}, 
        { name: 4, done: done, task: task}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(!err)
        _done()
      })
    })
    it('should run tasks respecting explicit order', function (_done) {
      var inflight = 0
      var done = function () {
        var finished = false;
        return function (cb) {
          var now = finished
          finished = !finished
          cb(null, now)
        }
      }
      var task = function (cb) {
        if (inflight > 0) assert.ok(false)
        inflight++
        setTimeout(function () { inflight--; cb() }, 10)
      }

      var tasks = [ 
        { name: 1, done: done(), task: task, order: 1}, 
        { name: 2, done: done(), task: task, order: 2},
        { name: 3, done: done(), task: task, order: 3},
        { name: 4, done: done(), task: task, order: 4}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(!err)
        _done()
      })
    })
    it('should run tasks with the same explicit order concurrently', function (_done) {
      var inflight = 0
      var done = function (cb) {
          cb(null, inflight === 4)
      }
      var task = function (cb) {
        inflight++
        setTimeout(function () { cb() }, 10)
      }

      var tasks = [ 
        { name: 1, done: done, task: task, order: 2}, 
        { name: 2, done: done, task: task, order: 2},
        { name: 3, done: done, task: task, order: 2},
        { name: 4, done: done, task: task, order: 2}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(!err)
        _done()
      })
    })
    it('should handle errors during done()', function (done) {
      var tasks = [ 
        { name: 1, done: function (cb) { cb(true)}, task: function () { }}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(err instanceof Error)
        done()
      })
    })
    it('should handle errors during task()', function (done) {
      var tasks = [ 
        { name: 1, done: function (cb) { cb(null, false)}, task: function (cb) { return cb(true) }}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(err instanceof Error)
        done()
      })
    })
    it('should throw error if done() fails after task() succeeds()', function (done) {
      var tasks = [ 
        { name: 1, done: function (cb) { cb(null, false)}, task: function (cb) { return cb(null) }}
      ]

      oneoff.run(tasks, function (err) {
        assert.ok(err instanceof Error)
        done()
      })
    })
  })
})

