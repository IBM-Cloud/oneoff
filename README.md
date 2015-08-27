# oneoff

Manage running one-off tasks for NodeJS applications on Cloud Foundry.

Cloud Foundry doesn't provide access to the host machine or bound services running your
application. This makes running manual configuration tasks (initialize this 
database, upgrade this table schema, etc.) during deployment a challenge...

There are a [number](https://docs.cloudfoundry.org/devguide/services/migrate-db.html) [of](https://docs.18f.gov/getting-started/cf-ssh/) [ways](https://blog.starkandwayne.com/2014/07/14/running-one-time-tasks-in-cloud-foundry/) to ~~hack~~ work around this but they rely on manual 
deployment steps, e.g. *temporarily deploy a single instance of your application with a
custom start command*. **Yuck.**

Using oneoff, you define your tasks as code which are automatically run during
the normal deployment. 

oneoff provides the following features...

* ensure tasks are completed before application startup
* coordinating app instances to ensure at-most once task execution 
* automagically discovering tasks from the task directory 
* dependency ordering, ensure task a completes before task b starts
* parallel task execution 
* ignore completed tasks in future deployments

No more [snowflake ops](http://martinfowler.com/bliki/SnowflakeServer.html).

## install 

<pre>
$ npm install oneoff --save
</pre>

## usage 

Once onceoff has been installed, you will need to write your tasks and then 
hook the module into your application startup. 

### defining tasks

*Tasks* are NodeJS [modules](https://nodejs.org/api/modules.html) that
implement the following interface: 

<pre>
module.exports = {
  name: "",
  done: function (callback) {
    // callback function (err || null, task_has_been_carried_out) {}
  }, 
  task: function (callback) {
    // callback function (err || null) {}
  },
  order: 0
}
</pre>

*name, done & task* are mandatory attributes, *order* is optional and defaults to zero.

*done* will execute *callback* with two arguments, the error parameter (or null) and the boolean value with the results of the test which determines whether the task has been executed previously. 

*task* will execute callback with one argument, the error parameter or null, when the task has finished.

For example, creating a new task to set up the database schema for our
application would follow the outline below. 

<pre>
module.exports = {
  name: "setup db tables",
  done: function (callback) {
    does_db_table_exist(function (err, result) {
      if (err) {
        callback(err) 
        return
      }      
      
      callback(null, result)
    })
  }, 
  task: function (callback) {
    setup_the_database(function (err) {
      if (err) {
        callback(err)
        return
      }

      callback()
    })
  },
  order: 0
}
</pre>

These modules will be loaded using *require()* at runtime and executed
according to the following ordering rules.

1. Tasks with the same order value are executed concurrently.
2. Tasks with order value N will only be executed when all tasks with order value < N have
   finished.
3. Tasks without an explicitly *order* property defined are assigned the default order value (0).

All tasks must live under the same parent directory.
Files without the ".js" postfix or with the *.* prefix will be ignored.

Any NPM packages defined in your package.json will be available to
your tasks.

### application startup 

Set the *oneoff* command to run before your application starts, e.g. using
*prestart* or *start* NPM scripts.

<pre>
{
  "name": "example",
  "scripts": {
    "prestart": "oneoff",
    "start": "node app.js"
  },
  "dependencies": {
    ...
  }
}
</pre>

By default, *oneoff* will search for tasks under the *./lib/tasks* directory.
This location can be modified using the *--tasks ./path/to/tasks* command line argument.

If the *oneoff* command has been correctly registered into application
startup, the following log entries should appear: 

<pre>
oneoff task runner (app instance #X): looking for tasks in ./lib/tasks
oneoff task runner (app instance #X): found the following tasks --> task.js
oneoff task runner (app instance #X): successfully loaded all tasks, starting execution...
oneoff task runner (app instance #X): finished executing all tasks!
</pre>

Errors from the tasks will cause the command to exit with a failure status
code and force the application startup to fail.

## limitations

Cloud Foundry default application startup time is [limited to sixty seconds](https://docs.cloudfoundry.org/devguide/deploy-apps/large-app-deploy.html). If task execution pushes the startup time over this threshold, the health check will restart the application. 

This value can be increased to a maximum of three minutes using the [*timeout*](https://docs.cloudfoundry.org/devguide/deploy-apps/manifest.html#timeout) property in the application manifest.



## tests

<pre>
$ npm tests
</pre>
