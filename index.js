// Lambda Function Handler (Node.js)
exports.handler = (event, context, callback) => {
  accountActivated(event, callback);
};

// Link traversals
var links = {
  account: '$._links.self.href'
};

// DSL for creating a resource flow
var flow = {
  tasks: [],
  callback: {},
  steps: {
    then: function(step) {
      flow.tasks.push(step);
      return flow.steps;
    },
    start: function(traversal, callback) {
      flow.callback = callback;
      flow.next({
        traversal: traversal
      });
    }
  },
  next: function(context) {
    flow.tasks.shift()(context);
  }
};

// Handle the account activated event
function accountActivated(event, callback) {
  // Loads the traverson client module
  var traverson = require('traverson');
  var JsonHalAdapter = require('traverson-hal');
  traverson.registerMediaType(JsonHalAdapter.mediaType, JsonHalAdapter);

  // Get the account resource href from event
  var accountUrl = event._links.account.href;

  // Apply the pending status to the attached account
  var traversal = traverson.from(accountUrl)
    .json()
    .withRequestOptions({
      headers: {
        "Accept": 'application/hal+json',
        "Content-Type": 'application/hal+json'
      }
    });

  // Execute account pending workflow
  flow.steps
    .then(getAccount)
    .start(traversal, callback);
}

// Gets the account and sends it to the next step
function getAccount(context) {
  console.log("Getting account...");

  // Fetch account resource
  var fetchResource = function(error, account, traversal) {
    if (error) return done(error);

    if (account.status != "ACCOUNT_ACTIVATED") {
      done("Account state invalid: " + account.status);
    } else {
      // Trigger the setPending step
      flow.callback(null, account);
    }
  };

  // Follow the account resource
  context.traversal
    .follow(links.account)
    .getResource(fetchResource);
}

// Something went wrong, notify the callback handler
function done(error) {
  flow.callback(error);
}
