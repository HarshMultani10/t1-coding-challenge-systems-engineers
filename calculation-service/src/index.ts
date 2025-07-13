// YOUR CODE HERE
import Kafka from 'node-rdkafka';
import { connectToDatabase, getPnLCollection, closeDatabase } from './db';
import { RawMarketMessage, RawTradeMessage, TradeMessage, MarketMessage, PnLCalculation } from './types';

// State for buffering trades until a market period is complete
let tradeBuffer: TradeMessage[] = [];

function toMarketMessage(raw: RawMarketMessage): MarketMessage {
  return {
    messageType: raw.messageType,
    buyPrice: parseFloat(raw.buyPrice),
    sellPrice: parseFloat(raw.sellPrice),
    startTime: new Date(raw.startTime),
    endTime: new Date(raw.endTime),
  };
}

function toTradeMessage(raw: RawTradeMessage): TradeMessage {
  return {
    messageType: raw.messageType,
    tradeType: raw.tradeType,
    volume: parseFloat(raw.volume),
    time: new Date(raw.time),
  };
}

async function connectToKafka(): Promise<Kafka.KafkaConsumer> {
  return new Promise((resolve, reject) => {
    const consumer = new Kafka.KafkaConsumer({
      'group.id': 'calculation-service-group',
      'metadata.broker.list': 'kafka:9092',
      'enable.auto.commit': true,
      'session.timeout.ms': 30000,
      'heartbeat.interval.ms': 3000,
    }, {});

    consumer.on('ready', () => {
      console.log('Calculation Service Kafka consumer ready');
      resolve(consumer);
    });

    consumer.on('event.error', (err) => {
      console.error('Kafka consumer error:', err);
      reject(err);
    });

    consumer.connect();
  });
}

async function main() {
  try {
    console.log('Starting Calculation Service...');
    
    // Connect to database
    await connectToDatabase();
    console.log('Calculation Service connected to database successfully');
    
    // Connect to Kafka with retry logic
    let consumer: Kafka.KafkaConsumer;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting to connect to Kafka (attempt ${retryCount + 1}/${maxRetries})...`);
        consumer = await connectToKafka();
        break;
      } catch (error) {
        retryCount++;
        console.error(`Kafka connection attempt ${retryCount} failed:`, error);
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to connect to Kafka after ${maxRetries} attempts`);
        }
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    const pnlCollection = getPnLCollection();

    // Subscribe to topics
    consumer!.subscribe(['market', 'trades']);
    consumer!.consume();

    consumer!.on('data', async (data) => {
      try {
        if (!data.value) return;
        const message = JSON.parse(data.value.toString());
        console.log(`Received message: ${message.messageType}`, JSON.stringify(message, null, 2));
        
        if (message.messageType === 'trades') {
          // Buffer all trades
          const trade = toTradeMessage(message);
          tradeBuffer.push(trade);
          console.log(`Buffered trade: ${trade.tradeType} ${trade.volume} at ${trade.time.toISOString()}`);
        } else if (message.messageType === 'market') {
          // On market message, calculate PnL for the period
          console.log(`Processing market message:`, JSON.stringify(message, null, 2));
          
          try {
            const market = toMarketMessage(message);
            console.log(`Processing market data: ${market.startTime.toISOString()} - ${market.endTime.toISOString()} - Buy: ${market.buyPrice}, Sell: ${market.sellPrice}`);
            
            // Get all trades in this period
            const tradesInPeriod = tradeBuffer.filter(trade =>
              trade.time >= market.startTime && trade.time <= market.endTime
            );
            
            // Remove processed trades from buffer
            tradeBuffer = tradeBuffer.filter(trade => trade.time > market.endTime);
            
            // Aggregate volumes
            let buyVolume = 0;
            let sellVolume = 0;
            for (const trade of tradesInPeriod) {
              if (trade.tradeType === 'BUY') buyVolume += trade.volume;
              else if (trade.tradeType === 'SELL') sellVolume += trade.volume;
            }
            
            // Calculate PnL
            const pnl = (market.sellPrice - market.buyPrice) * (sellVolume - buyVolume);
            
            // Store in DB
            const pnlDoc: PnLCalculation = {
              startTime: market.startTime,
              endTime: market.endTime,
              buyPrice: market.buyPrice,
              sellPrice: market.sellPrice,
              buyVolume,
              sellVolume,
              pnl,
              createdAt: new Date(),
            };
            
            console.log(`About to store PnL document:`, JSON.stringify(pnlDoc, null, 2));
            
            try {
              const result = await pnlCollection.insertOne(pnlDoc);
              console.log(`Stored PnL for period ${market.startTime.toISOString()} - ${market.endTime.toISOString()}: ${pnl} (Buy: ${buyVolume}, Sell: ${sellVolume}) - Inserted ID: ${result.insertedId}`);
            } catch (dbError) {
              console.error('Failed to store PnL calculation:', dbError);
            }
          } catch (marketError) {
            console.error('Error processing market message:', marketError);
            console.error('Market message that caused error:', JSON.stringify(message, null, 2));
          }
        }
      } catch (err) {
        console.error('Error processing Kafka message:', err);
      }
    });

    console.log('Calculation Service is running and processing messages...');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Calculation Service received SIGINT, shutting down...');
      consumer!.disconnect();
      await closeDatabase();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Calculation Service received SIGTERM, shutting down...');
      consumer!.disconnect();
      await closeDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Fatal error in Calculation Service:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error in Calculation Service:', err);
  process.exit(1);
});