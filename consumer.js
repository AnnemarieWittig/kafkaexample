import { KafkaClient as Client, Consumer, Message, Offset, OffsetFetchRequest, ConsumerOptions } from 'kafka-node';

const kafkaHost = 'localhost:9092';
const outputdir = './filled-templates/'

export function kafkaSubscribe(topic) {
    const client = new Client({ kafkaHost });
    const topics = [{ topic: topic, partition: 0 }];
    const options = { autoCommit: false, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024 };

    const consumer = new Consumer(client, topics, options);

    consumer.on('error', function (err) {
        console.log('error', err);
    });

    client.refreshMetadata(
        [topic],
        (err) => {
            const offset = new Offset(client);

            if (err) {
                throw err;
            }

            consumer.on('message', function (message) {
                console.log(message)
                var output = outputdir + Date.now() + ".json"
                jsonfile.writeFile(output, message)
                    .then(res => {
                        console.log('Write complete to: ' + output)
                    })
                    .catch(error => { console.error(error); process.exitCode = 1 })
            });

            /*
             * If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
             */
            consumer.on(
                'offsetOutOfRange',
                (topic) => {
                    offset.fetch([topic], function (err, offsets) {
                        if (err) {
                            return console.error(err);
                        }
                        const min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                        consumer.setOffset(topic.topic, topic.partition, min);
                    });
                }
            );
        }
    );
}