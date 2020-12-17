const dotenv = require('dotenv');
const Server = require('ws');
const express = require('express');
const kafkaSubscribe = require('./consumer');
dotenv.config();

const PORT = parseInt(process.env.PORT) || 3210;

const app = express();

// Server static files
app.use(express.static('./'));

const server = new Server({ server: app.listen(PORT) });

function send(message) {
    server.clients.forEach(
        (client) => {
            client.send(message.value);
        }
    );
}

server.on(
    'connection',
    () => {
        // subscribe to the `test` stream
        kafkaSubscribe(
            'test',
            (message) => {
                send(message);
            }
        );
    }
);

console.log(`Server listening: http://localhost:${PORT}`);