var INSTANCE_ZERO = (process.env.CF_INSTANCE_INDEX === '0')
var DEFAULT_TIMEOUT = 1000

var run = function (queued, finished) {
  var halted = false, running = [], last_task_order = null

  var dequeue = function (task) {
    if (halted) return

    running.splice(running.indexOf(task), 1)

    if (!running.length) {
      last_task_order = null

      if (queued.length) {
        enqueue()
        return
      }

      finished()
    }
  }

  var enqueue = function () {
    if (halted || !queued.length) return

    var task = queued.pop(),
      task_order = task.order || 0

    // An ordered task can only be ran when all tasks with a lower
    // order are finished.
    if (last_task_order !== null && task_order > last_task_order) {
      queued.push(task)
      return
    }

    running.push(task)
    last_task_order = task_order
    task.done(wait_callback(task))
    enqueue()
  }

  var halt = function (err) {
    if (halted) return

    halted = true
    running.forEach(function (task) {
      if (task._timeout) clearTimeout(task._timeout)
    })
    finished(err instanceof Error ? err : new Error(err))
  }

  // Return callback handler for the initial "done()" check.
  //
  // If app instance is zero, schedule the task work and verify it's completed
  // when finished. Error thrown if "task()" finishes but "done()" returns false
  // as waiting instances will never finish.
  //
  // If app instance is not zero, enter wait loop and re-check until "done()" is
  // true.
  var wait_callback = function (task) {
    var if_not_done = function (is_not_done) {
      return function (err, is_done) {
        if (halted) return

        if (err) {
          halt(err)
          return
        }

        if (!is_done) {
          is_not_done()
          return
        }

        dequeue(task)
      }
    }

    var run_and_check_task = function () {
      var halt_task = halt.bind(this, 'task() finished, but done() returning false.'),
        check_task = task.done.bind(task, if_not_done(halt_task)),
        run_task = task.task.bind(task, if_not_done(check_task))

      return if_not_done(run_task)
    }

    var wait_till_finished = function () {
      var wait_timer = if_not_done(function () {
        var timeout_handler = task.done.bind(task, wait_timer)
        task._timeout = setTimeout(timeout_handler, oneoff.timeout)
      })
      return wait_timer
    }

    //console.log(oneoff.instance_zero)
    return oneoff.instance_zero ? run_and_check_task() : wait_till_finished()
  }

  if (!queued.length) {
    halt('List of tasks contained zero items')
    return
  }

  queued.every(function (task, idx) {
    return ['name', 'done', 'task'].every(function (param) {
      var has_prop = task.hasOwnProperty(param)
      if (!has_prop) halt('Task (' + idx + '), missing required property: ' + param)
      return has_prop
    })
  })

  if (halted) return

  // Sort into descending order, so we can pop()
  // the next task to run based upon priority order.
  // Tasks without an explicit order are ran before any others.
  queued = queued.sort(function (a, b) {
    return ((b.order || 0) - (a.order || 0))
  })

  enqueue()
}

var oneoff = module.exports = {
  run: run,
  timeout: DEFAULT_TIMEOUT,
  instance_zero: INSTANCE_ZERO, 
  check: function () {
    return oneoff.instance_zero
  }
}
