import { Firestore }                   from '@google-cloud/firestore';
import { PubSub, Subscription, Topic } from '@google-cloud/pubsub';
import { credentials }                 from '@grpc/grpc-js';
import { handleQuoteTranslate }        from './translate.service';

if (process.env.NODE_ENV === 'develop') {
  require('dotenv').config();
}

// host set by FIRESTORE_EMULATOR_HOST env variable
export const firestore           = new Firestore({ projectId: 'dummy' });
const [ pubsubHost, pubsubPort ] = process.env.PUBSUB_EMULATOR_HOST.split(':');
const options                    = {
  projectId:   'stub',
  port:        pubsubPort,
  servicePath: pubsubHost,
  sslCreds:    credentials.createInsecure()
};

export const pubsub = new PubSub(options);

const SUBSCRIPTION_NAME = 'quotes-translate-worker';
const TOPIC_NAME        = 'quote.translate';

const getOrCreateTopic = async (topicName: string): Promise<Topic> => {
  let topic             = await pubsub.topic(topicName);
  const [ topicExists ] = await topic.exists();
  if (!topicExists) {
    [ topic ] = await pubsub.createTopic(topicName);
  }
  return topic;
};

const getOrCreateSubscription = async (topic: Topic, subName: string): Promise<Subscription> => {
  let sub             = topic.subscription(subName);
  const [ subExists ] = await sub.exists();
  if (!subExists) {
    [ sub ] = await topic
      .createSubscription(SUBSCRIPTION_NAME);
  }
  return sub;
};

// async IIFE to create async context
(async () => {
  const sub = await getOrCreateSubscription(await getOrCreateTopic(TOPIC_NAME), SUBSCRIPTION_NAME);
  // maybe need to add some messages throttling, if there will be a lot of them
  sub.on('message', msg => {
    handleQuoteTranslate(msg.data)
      // acknowledge message only in case of success
      .then(() => msg.ack())
      .catch(err => {
        console.log(err);
        // schedule redelivery
        msg.nack();
      });
  });
  console.log('Subscribed to topic, waiting for messages...');
})();
// no .catch added intentionally, to let it crash, to be restarted by docker.


