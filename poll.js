const EventEmitter = require("events");

class PollDatabase extends EventEmitter {
  constructor() {
    super();
    this.polls = [];
  }

  createPoll(question, options) {
    const poll = {
      id: this.generateId(),
      question: question,
      options: options.map((opt) => ({
        id: this.generateId(),
        text: opt,
        votes: [],
      })),
      voters: {}, // New property to track all voters
    };
    this.polls.push(poll);
    this.emit("pollCreated", poll);
    return poll;
  }

  getPoll(id) {
    return this.polls.find((poll) => poll.id === id);
  }

  getAllPolls() {
    return this.polls;
  }

  vote(pollId, optionId, voterId) {
    const poll = this.getPoll(pollId);
    if (!poll) return null;

    const option = poll.options.find((opt) => opt.id === optionId);
    if (!option) return null;

    if (poll.voters[voterId]) {
      const previousVote = poll.voters[voterId];
      const previousOption = poll.options.find(
        (opt) => opt.id === previousVote
      );
      if (previousOption) {
        previousOption.votes = previousOption.votes.filter(
          (id) => id !== voterId
        );
      }
    }

    option.votes.push(voterId);
    poll.voters[voterId] = optionId;

    this.emit("vote", { pollId, optionId, voterId });
    return poll;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new PollDatabase();
