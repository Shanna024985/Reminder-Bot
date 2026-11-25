import 'dotenv/config';
import { fakeGameItems } from './game.js';
import { InstallGlobalCommands } from './utils.js';

// Wiki command for game lookup

const REMINDER_COMMAND = {
  name: 'reminder',
  type: 1,
  description: 'Send a DM to a Discord user',
  options: [
    {
      type: 6,
      name: 'user',
      description: 'The user to message',
      required: true,
    },
    {
      type: 3,
      name: 'message',
      description: 'The message to send',
      required: true,
    },
    {
      type: 7,
      name: 'channel',
      description: 'Select a channel',
      required: true,
    },
    {
      type: 3,
      name: 'reminder_time',
      description: 'Enter deadline',
      required: true,
    },
  
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};


const ALL_COMMANDS = [
  REMINDER_COMMAND
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
