// Import all dependencies, mostly using destructuring for better view.
import { ClientConfig, Client, middleware, MiddlewareConfig, WebhookEvent, TextMessage, MessageAPIResponseBase, ImageMessage } from '@line/bot-sdk';
import express, { Application, Request, Response } from 'express';

const QRCode = require('qrcode')
require('dotenv').config();
const AWS = require("aws-sdk");
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// })
const s3 = new AWS.S3()

// Setup all LINE client and Express configurations.
const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET,
};

const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET || '',
};

const PORT = process.env.PORT || 3000;

// Create a new LINE SDK client.
const client = new Client(clientConfig);

// Create a new Express application.
const app: Application = express();

const uploadFileToS3 = async (fileName: string, data: any) => {
  try{
    const buffer: Buffer = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const type = data.split(';')[0].split('/')[1];
    fileName = fileName + String(type);
    console.log("Upload to S3 Started")
    const uploadResp = await s3.upload({
      Body: buffer,
      ACL: 'public-read',
      Bucket: process.env.AWS_S3_BUCKET_FILES,
      Key: fileName,
      ContentEncoding: 'base64',
      ContentType: `image/${type}`
    }).promise()
  
    console.log(JSON.stringify(uploadResp))
    // console.log(JSON.stringify(uploadResp.Location))
  
    // get it back
    // let image = await s3.getObject({
    //   Bucket: process.env.AWS_S3_BUCKET_FILES,
    //   Key: fileName,
    // }).promise()
    // console.log(image);
    console.log("Uploadd to S3 Completed")
    return uploadResp.Location;
  } catch(err) {
    console.log(err)
    return "err"
  }
}

const qrCodeGenerator = async (data: any) => {
  try{
    console.log(data)
    const imageFileName = String(data["customerId"]) + String(Date.now()) 
    console.log(imageFileName)
    data = JSON.stringify(data)
    // await QRCode.toFile("qrcode.jpeg", data)
    console.log("data Conversion Started")
    const qrCodeData = await QRCode.toDataURL(data)
    console.log("data Conversion Done")
    return await uploadFileToS3(imageFileName, qrCodeData);
  } catch(err) {}
  // console.log(qrCode)
  // return qrCode;
}

// Function handler to receive the text.
const textEventHandler = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
  // Process all variables here.
  // console.log(JSON.stringify(event))
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  // Process all message related variables here.
  const { replyToken } = event;
  const { text } = event.message;

  // Create a new message.
  // const response: TextMessage = {
  //   type: 'text',
  //   text,
  // };
  const qrData = {
    customerId: event.source.userId,
    campaign: "This is me",
    timestamp: Date.now()
  }
  const qrCodeURL = await qrCodeGenerator(qrData)
  // console.log("qrcode: ", qrCode)
  const responseImage: ImageMessage = {
    type: "image",
    previewImageUrl: qrCodeURL,
    originalContentUrl: qrCodeURL
  }
  // await client.replyMessage(replyToken, responseImage);
  console.log("Image Response")
  const responseText: TextMessage = {
    type: "text",
    text: qrCodeURL
  }
  console.log("Test Response STarted")
  await client.replyMessage(replyToken, [responseImage, responseText]);
  console.log("Test Response Done")
  // console.log(JSON.stringify(response))
  // Reply to the user.
};

// Register the LINE middleware.
// As an alternative, you could also pass the middleware in the route handler, which is what is used here.
// app.use(middleware(middlewareConfig));

// Route handler to receive webhook events.
// This route is used to receive connection tests.
app.get(
  '/',
  async (_: Request, res: Response): Promise<Response> => {
    return res.status(200).json({
      status: 'success',
      message: 'Connected successfully!',
    });
  }
);

// This route is used for the Webhook.
app.post(
  '/webhook',
  middleware(middlewareConfig),
  async (req: Request, res: Response): Promise<Response> => {
    const events: WebhookEvent[] = req.body.events;

    // Process all of the received events asynchronously.
    const results = await Promise.all(
      events.map(async (event: WebhookEvent) => {
        try {
          await textEventHandler(event);
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(err);
          }

          // Return an error message.
          return res.status(500).json({
            status: 'error',
          });
        }
      })
    );

    // Return a successfull message.
    return res.status(200).json({
      status: 'success',
      results,
    });
  }
);

// Create a server and listen to it.
app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});
