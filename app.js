import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  getServerLeaderboard,
  createPlayerEmbed,
  parseDiscordTimestamp
} from './utils.js';
import { getFakeProfile, getWikiItem } from './game.js';
import cron from 'node-cron';
// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));
app.get("/", (req, res) => {
  res.send("Hello")
})
const ALLOWED_USERS = [
  "713746365938663474"
];
const reminders = [];
async function sendDM(userId, message, channelId) {
  // Create or retrieve the DM channel
  const dmResponse = await fetch(
    'https://discord.com/api/v10/users/@me/channels',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId
      })
    }
  );

  if (!dmResponse.ok) {
    throw new Error(await dmResponse.text());
  }

  const dmChannel = await dmResponse.json();

  // Send the DM
  const messageResponse = await fetch(
    `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: `${message}\n<#${channelId}>`
      })
    }
  );

  if (!messageResponse.ok) {
    throw new Error(await messageResponse.text());
  }
}
/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
cron.schedule('* * * * *', async () => {

  console.log('Checking reminders...');

  const currentTime = Math.floor(Date.now() / 1000);

  for (const reminder of reminders) {

    if (!reminder.sent && currentTime >= reminder.reminderTime) {

      try {
        await sendDM(
          reminder.userId,
          reminder.message,
          reminder.channelId
        );

        reminder.sent = true;

        console.log('Reminder sent!');

      } catch (error) {
        console.error('Failed to send reminder:', error);
      }
    }
  }

});
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, data, member } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Log request bodies
  console.log(req.body);

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'reminder') {
      let haveEntry = false
      ALLOWED_USERS.forEach((value) => {
        if (member.user.id == value) {
          haveEntry = true
        }
      })
      if (haveEntry) {
        const userId = data.options.find(
          option => option.name === 'user'
        ).value;

        const message = data.options.find(
          option => option.name === 'message'
        ).value;

        const channel = data.options.find(
          option => option.name === 'channel'
        ).value;

        const deadline = data.options.find(
          option => option.name === 'reminder_time'
        ).value;

        const dates = parseDiscordTimestamp(deadline);

        if (!dates) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Invalid timestamp!',
              flags: 64
            }
          });
        }

        // Calculate waiting time
        const currentTimestamp = Math.floor(Date.now() / 1000);

        const secondsNeededToWait = dates.unix - currentTimestamp;

        if (secondsNeededToWait <= 0) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'The reminder time must be in the future!',
              flags: 64
            }
          });
        }

        // Acknowledge Discord immediately
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Reminder scheduled for <t:${dates.unix}:F>!`,
            flags: 64
          }
        });
        reminders.push({
          userId: userId,
          message: message,
          channelId: channel,
          reminderTime: dates.unix,
          sent: false
        });

        return;
      } else {
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `You do not have permission to use this bot`,
            flags: 64
          }
        });
      }

    }
  }

  // handle button interaction
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const profile = getFakeProfile(0);
    const profileEmbed = createPlayerEmbed(profile);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [profileEmbed],
      },
    });
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
