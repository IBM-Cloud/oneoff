# oneoff

Manage running one-off tasks for NodeJS applications on Cloud Foundry.

Cloud Foundry doesn't provide access to the host machine or bound services when running your
application. This makes running manual configuration tasks (initialize this 
database, upgrade this table schema, etc.) during deployment a challenge...

There are a number of ways to ~~hack~~ work around this but they rely on manual 
deployment steps, e.g. *deploy a single instance of your application with a
custom start command*. **Yuck.**

Using oneoff, you define your tasks as code which are automatically run during
the normal deployment. ...No more [snowflake ops](http://martinfowler.com/bliki/SnowflakeServer.html).

oneoff provides the following features...

* ensure tasks are completed before application startup
* coordinating app instances to ensure at-most once task execution 
* automagically discovering tasks from the task directory 
* dependency ordering, ensure task a completes before task b starts
* parallel task execution 
* ignore completed tasks in future deployments

## install 

$ npm install oneoff

## usage 

### define tasks
### start oneoff during deployment

## tests

$ npm tests
