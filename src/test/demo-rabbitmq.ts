import amqp from 'amqplib'

const runConsumer = async () => {
  let channelModel: amqp.ChannelModel | undefined = undefined
  let channel: amqp.Channel | undefined = undefined
  channelModel = await amqp.connect('amqp://guest:guest@localhost:5672')
  console.log('consumer channelModel:', !!channelModel)
  channel = await channelModel.createChannel()
  console.log('consumer channel:', !!channel)
  await channel.assertQueue('tmp', { durable: true })
  await channel.consume(
    'tmp',
    (msg) => {
      if (msg === null) {
        return
      }
      const data = String(msg.content)
      console.log('consumer data:', data)
    },
    { noAck: true },
  )
  setTimeout(async () => {
    console.log('consumer closing…')
    if (channel) {
      await channel.close()
      channel = undefined
    }
    if (channelModel) {
      await channelModel.close()
      channelModel = undefined
    }
  }, 10000)
}

const runPublisher = async () => {
  let channelModel: amqp.ChannelModel | undefined = undefined
  let channel: amqp.Channel | undefined = undefined
  channelModel = await amqp.connect('amqp://guest:guest@localhost:5672')
  console.log('publisher channelModel:', !!channelModel)
  channel = await channelModel.createChannel()
  console.log('publisher channel:', !!channel)
  await channel.assertQueue('tmp', { durable: true })
  channel.sendToQueue('tmp', Buffer.from('Hello!'))
  setTimeout(async () => {
    console.log('publisher closing…')
    if (channel) {
      await channel.close()
      channel = undefined
    }
    if (channelModel) {
      await channelModel.close()
      channelModel = undefined
    }
  }, 10000)
}

void runConsumer()
void runPublisher()
