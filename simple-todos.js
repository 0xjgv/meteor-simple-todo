var Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish("tasks", function() {
    return Tasks.find({
      $or: [{
        private: {
          $ne: true
        }
      }, {
        owner: this.userId
      }]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function() {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({
          checked: {
            $ne: true
          }
        }, {
          sort: {
            createdAt: -1
          }
        });
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {
          sort: {
            createdAt: -1
          }
        });
      }
    },
    hideCompleted: function() {
      return Session.get("hideCompleted");
    },
    incompleteCount: function() {
      return Tasks.find({
        checked: {
          $ne: true
        }
      }).count();
    }
  });

  Template.body.events({
    "submit .new-task": function(event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get values from form element
      var resto = document.getElementById("resto");
      var cuisine = document.getElementById("cuisine");
      var location = document.getElementById("place");

      // Insert a task into the collection
      Meteor.call("addTask", {
        name: resto.value,
        cuisine: cuisine.value,
        location: location.value,
      });

      // Clear form
      resto.value = "";
      cuisine.value = "";
      location.value = "";
      resto.focus();
    }
  });

  Template.task.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .toggle-checked": function() {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, !this.checked);
    },
    "click .delete": function() {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function() {
      Meteor.call("setPrivate", this._id, !this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addTask: function(data) {
    // Make sure the user is logged in before inserting a task
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      restaurant: data.name,
      type: data.cuisine,
      location: data.location,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function(taskId) {
    var task = Tasks.findOne(taskId);
    if (task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },
  setChecked: function(taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, {
      $set: {
        checked: setChecked
      }
    });
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, {
      $set: {
        private: setToPrivate
      }
    });
  }
});
