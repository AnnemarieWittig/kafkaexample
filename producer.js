const fs = require('fs')
const jsonfile = require('jsonfile')
const nunjucks = require('nunjucks');

var program = require('commander')
import kafka from "kafka-node";
import uuid from "uuid";

program
    .version('0.8.0')
    .usage('node exampletemplate-generator.js creates jsonld files per class')

var directory = './templates'
nunjucks.configure(directory, {
    autoescape: true
})

function getOutputFile(dir, file) {
    if (dir.charAt(dir.length - 1) == "\\" || dir.charAt(dir.length - 1) == "/") {
        return dir + file
    } else if (dir.includes("/") && dir.charAt(dir.length - 1) != "/") {
        return dir + "/" + file
    } else {
        return dir + "\\" + file
    }
}

function iterate_over_json(json) {
    for (let key in json) {
        if (!(json[key] === undefined) && json[key] != null && typeof json[key] != 'object') {
            json = write_value(json, key)
        }
        if (!(json[key] === undefined) && typeof json[key] == 'object') {
            iterate_over_json(json[key])
        }
    }
    return json;
}

function write_value(json, key) {
    var value = json[key]
    switch (value) {
        case "{{STRING}}":
            value = generate_string(25)
            break;
        case "{{VAL}}":
            value = generate_string(10)
            break;
        case "{{ANYURI}}":
        case "{{ID}}":
            value = generate_uri()
            break;
        case "{{DATETIME}}":
            value = generate_date()
            break;
        default:
            if (value.includes("{{")) {
                console.log(value);
                value = generate_string(10)
            }
            break;
    }
    json[key] = value
    return json
}

function generate_string(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generate_value(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generate_number(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generate_date() {
    var start = new Date(getRandomIntInclusive(2000, 2019), getRandomIntInclusive(1, 12), getRandomIntInclusive(1, 28))
    var end = new Date()
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generate_uri() {
    return "http://" + generate_value(8) + "/" + generate_value(14) + "/" + generate_value(10) + "#"
}

const client = new kafka.Client("kafka", "my-client-id", {
    sessionTimeout: 300,
    spinDelay: 100,
    retries: 2
});

const producer = new kafka.HighLevelProducer(client);
producer.on("ready", function () {
    console.log("Kafka Producer is connected and ready.");
});

// For this demo we just log producer errors to the console.
producer.on("error", function (error) {
    console.error(error);
});

const kafkaHost = 'localhost:9092';

export function publish(topic) {
    // The client connects to a Kafka broker
    const client = new Client({ kafkaHost });
    // The producer handles publishing messages over a topic
    const producer = new Producer(client);

    // First wait for the producer to be initialized
    producer.on(
        'ready',
        () => {
            // Update metadata for the topic we'd like to publish to
            client.refreshMetadata(
                [topic],
                (err) => {
                    if (err) {
                        throw err;
                    }
                    fs.readdir(directory, (err, files) => {
                        files.forEach(file => {
                            jsonfile.readFile(directory + "\\" + file)
                                .then(
                                    function (json) {
                                        var message = iterate_over_json(json)
                                            console.log(`Sending message to ${topic}: ${message}`);
                                        producer.send(
                                            [{ topic, messages: [message] }],
                                            (err, result) => {
                                                console.log(err || result);
                                                process.exit();
                                            }
                                        );
                                    })
                                .catch(error => { console.error(error); process.exitCode = 1 })
                        });
                    });
                }
            );
        }
    );

    // Handle errors
    producer.on(
        'error',
        (err) => {
            console.log('error', err);
        }
    );
}


const KafkaService = {

    sendRecord: ({ type, userId, sessionId, data }, callback = () => { }) => {
        if (!userId) {
            return callback(new Error("A userId must be provided."));
        }
        fs.readdir(directory, (err, files) => {
            files.forEach(file => {
                jsonfile.readFile(directory + "\\" + file)
                    .then(
                        function (json) {
                            json = iterate_over_json(json)
                            var output = getOutputFile(file)
                            const event = {
                                id: uuid.v4(),
                                timestamp: Date.now(),
                                userId: userId,
                                sessionId: sessionId,
                                type: type,
                                data: data
                            };
                            // Create a new payload
                            const record = [
                                {
                                    topic: "test",
                                    messages: output,
                                    attributes: 1 /* Use GZip compression for the payload */
                                }
                            ];

                            //Send record to Kafka and log result/error
                            producer.send(record, callback);
                        })
                    .catch(error => { console.error(error); process.exitCode = 1 })
            });
        });
    }
};

export default KafkaService;