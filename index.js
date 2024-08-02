const express = require("express");
const app = express();
const port = 3000;
// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require("@slack/web-api");

// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(process.env.token, {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG,
});
// Post a message to a channel your app is in using ID and message text
async function publishMessage(id, text) {
  try {
    // Call the chat.postMessage method using the built-in WebClient
    const result = await client.chat.postMessage({
      // The token you used to initialize your app
      token: process.env.token,
      channel: id,
      text: text,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Will I complete this thing by 6:00 PM?",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Choose an option:",
          },
          accessory: {
            type: "radio_buttons",
            action_id: "poll_vote",
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "Yes",
                },
                value: "yes",
              },
              {
                text: {
                  type: "plain_text",
                  text: "No",
                },
                value: "no",
              },
            ],
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                emoji: true,
                text: "Submit Vote",
              },
              style: "primary",
              value: "submit_vote",
              action_id: "submit_vote",
            },
          ],
        },
      ],
      // You could also use a blocks[] array to send richer content
    });

    // Print result, which includes information about the message (like TS)
    console.log(result);
  } catch (error) {
    console.error(error);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  publishMessage("C07EVLB1ABD", "Hello world :tada:");
  res.send("OK");
});

app.post("/interact", (req, res) => {
  console.log(req.body);
  console.log("Some interaction received");
  res.send("OK");
});

app.post("/event-listener", (req, res) => {
  const { challenge } = req.body;
  console.log("Some event listened");
  console.log({ challenge });
  res.send({ challenge });
});

app.listen(port, () => {
  console.log(`Slack Bot Server listening on port ${port}`);
});
