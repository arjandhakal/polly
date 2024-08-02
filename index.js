const express = require('express')
const app = express()
const port = 3000
// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require('@slack/web-api')
require('dotenv').config()

// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(process.env.token, {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG,
})

const pollDb = require('./poll')
// Post a message to a channel your app is in using ID and message text
async function publishMessage(poll, channelId) {
  try {
    // Call the chat.postMessage method using the built-in WebClient
    const result = await client.chat.postMessage({
      // The token you used to initialize your app
      token: process.env.token,
      channel: channelId,
      text: poll.question,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: poll.question,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Choose an option:',
          },
          accessory: {
            type: 'radio_buttons',
            action_id: 'poll_vote',
            options: poll.options.map((opt) => {
              return {
                text: {
                  type: 'plain_text',
                  text: opt.text,
                },
                value: `${poll.id}$$||$$${opt.id}`,
              }
            }),
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                emoji: true,
                text: 'Submit Vote',
              },
              style: 'primary',
              value: 'submit_vote',
              action_id: 'submit_vote',
            },
          ],
        },
      ],
    })

    // Print result, which includes information about the message (like TS)
  } catch (error) {
    console.error(error)
  }
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  // publishMessage('C07FX79N0N4', 'Hello world :tada:')
  res.send('OK')
})

app.post('/interact', (req, res) => {
  const payload = JSON.parse(req.body.payload)
  if (payload.actions[0].action_id == 'submit_vote') {
    const userId = payload.user.id
    const userName = payload.user.username
    const value = payload.state.values
    const valueKeys = Object.keys(value)
    let ourKey = ''
    for (const key of valueKeys) {
      if (Object.keys(value[key]).includes('poll_vote')) {
        ourKey = key
      }
    }
    const selectedVote = value[ourKey].poll_vote.selected_option.value
    const [pollId, optionId] = selectedVote.split('$$||$$')
    pollDb.vote(pollId, optionId, userName)
  }
  res.send('OK')
})

app.post('/event-listener', (req, res) => {
  const { challenge } = req.body

  res.send({ challenge })
})

// Create a new poll
app.post('/polls', (req, res) => {
  const { question, options } = req.body
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({
      error: 'Invalid poll data. Provide a question and at least two options.',
    })
  }
  const newPoll = pollDb.createPoll(question, options)
  res.status(201).json(newPoll)
})

// Get all polls
app.get('/polls', (req, res) => {
  const polls = pollDb.getAllPolls()
  res.json(polls)
})

// Get a specific poll
app.get('/polls/:id', (req, res) => {
  const poll = pollDb.getPoll(req.params.id)
  if (poll) {
    res.json(poll)
  } else {
    res.status(404).json({ error: 'Poll not found' })
  }
})

// Vote on a poll
app.post('/polls/:id/vote', (req, res) => {
  const { optionId, voterId } = req.body
  if (!optionId || !voterId) {
    return res.status(400).json({ error: 'Both optionId and voterId are required' })
  }
  const updatedPoll = pollDb.vote(req.params.id, optionId, voterId)
  if (updatedPoll) {
    res.json(updatedPoll)
  } else {
    res.status(404).json({ error: 'Poll or option not found' })
  }
})

app.listen(port, () => {
  console.log(`Slack Bot Server listening on port ${port}`)
})

pollDb.on('pollCreated', (poll) => {
  publishMessage(poll, process.env.channelId)
})

// Listen for 'vote' event
pollDb.on('vote', ({ pollId, optionId, voterId }) => {
  console.log(`Vote recorded: Poll ${pollId}, Option ${optionId}, Voter ${voterId}`)
})
