const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const app = express();
const producer = require('./producer')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

router.post('/create', (req, res) => {
    var topic = req.body.topic;
    var message = req.body.message;
    console.log('TOPIC:', program.topic);
    console.log('MESSAGE:', message);
    producer.publish(program.topic, message);
    res.end("finished");
});

app.listen(3000, () => {
    console.log("Started on PORT 3000");
})