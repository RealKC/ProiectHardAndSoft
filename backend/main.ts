import { createJsonTranslator, createLanguageModel } from "typechat";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  Response as IntentsResponse,
  IntentsSchema,
} from "../common/types/intents";
import { FinalResponseSchema } from "../common/types/response";
import { createZodJsonValidator } from "typechat/zod";
import { z } from "zod";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { fastifyCookie } from "@fastify/cookie";
import { fastifySecureSession } from "@fastify/secure-session";
import { WebSocket } from "ws";
import { addHours, isBefore } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import Jimp from "jimp";
import jsQR from "jsqr";

const lm = createLanguageModel({
  // OPENAI_MODEL: "phi3:3.8b-mini-instruct-4k-fp16",
  OPENAI_MODEL: "llama3:8b-instruct-q8_0",

  OPENAI_ENDPOINT: "http://192.168.100.82:11434/v1/chat/completions",
  OPENAI_API_KEY: "ollama",
});

lm.retryPauseMs = 0;

let latestImageBytes: Uint8Array | undefined;

declare module "@fastify/secure-session" {
  interface SessionData {
    user?: { name: string };
  }
}

let currentLightLevel = Math.random();
let currentSunPowerLevel = Math.random();
let currentTemperature = Math.floor(Math.random() * (32 - 17 + 1) + 17);

function toPercents(value: number) {
  return (value * 100).toFixed(2) + "%";
}

function formatTemperatureObservation(value: number): string {
  if (value <= 17) {
    return "very cold / freezing";
  }

  if (value <= 18) {
    return "cold";
  }

  if (value <= 20) {
    return "it's not warm nor it's cold, some people might consider this temperature perfect";
  }

  if (value <= 22) {
    return "warm";
  }

  if (value <= 25) {
    return "hot";
  }

  if (value <= 27) {
    return "very hot";
  }

  return "dangerously hot";
}

function formatHouseLightsObservation(value: number): string {
  const percent = value * 100;

  if (percent <= 15) {
    return "very dark";
  }

  if (percent <= 30) {
    return "dim";
  }

  if (percent <= 50) {
    return "pleasant";
  }

  if (percent <= 80) {
    return "bright";
  }

  return "very bright";
}

function formatSunObservation(value: number): string {
  const percent = value * 100;

  if (percent <= 15) {
    return "very dark";
  }

  if (percent <= 30) {
    return "dim";
  }

  if (percent <= 50) {
    return "pleasant";
  }

  if (percent <= 80) {
    return "bright";
  }

  return "very bright";
}

function getFinalPromptContext(intent: IntentsResponse): string {
  switch (intent.intent) {
    case "bedtime-story":
      return `
        Inform the user you closed the lights in the house.
        Tell a short bedtime story with a nice ending.
      `;

    case "start-alarm":
      return `
          Do ONLY one of the following:
          - say BEEP BEEP BEEP.
          - inform the user that an alarm has been started

          ONLY IF the user seems in trouble inform them that you hope the situation is OK.
          ONLY IF there are wild animals or dangers outside the house inform them that you hope the situation is OK.
        `;

    case "welcome":
      return `
        You are an AI Smart Home Assistant. Your name is ABC (short for Artificial Based Control).
        
        Inform the user of your capabilities/greet him.
        Mention some of the following:
        - create custom charts for indoor light intensity/sun intensity/temperature fluctuations for any period of time
        - you can tell the current sun intensity
        - you can tell house current light level
        - open the houses's blinds
        - turn lights on/off
        - sound a alarm to scare off wild animals
        - start a live camera feed
        - take a photo and describe it to you
        - maybe the user wants a clothing suggestion

        (Optional): Prompt the user to continue exploring the application to find out more features.
      `;

    case "battery_level":
      if (intent.data.type === "value") {
        return `The battery level currently is 73.23%`;
      }
      return `
        Inform the user that the sun battery level chart for the given period/date is presented right now.
        Don't say anything else about the chart information.
        Don't mention this exact text
      `;

    case "sun_intensity":
      if (intent.data.type === "value") {
        return `Sun intensity currently is ${toPercents(
          currentSunPowerLevel
        )} which is ${formatSunObservation(currentSunPowerLevel)}`;
      }

      return `
          Inform the user that the sun intensity chart for the given period/date is presented right now.
          Don't say anything else about the chart information.
          Don't mention this exact text
        `;

    case "house_lighting_level":
      if (intent.data.type === "value") {
        return `The house light level currently is ${toPercents(
          currentLightLevel
        )} which means the room's lighting level is ${formatHouseLightsObservation(
          currentLightLevel
        )}`;
      }

      return `
            Inform the user that the house light level chart for the given period/date is presented right now.
            Don't say anything else about the chart information.
            Don't mention this exact text
          `;

    case "temperature":
      if (intent.data.type === "value") {
        return `Say that temperature currently is ${currentTemperature} Celsius (also mention it's ${formatTemperatureObservation(
          currentTemperature
        )})`;
      }
      return `
        Inform the user that the temperature chart for the given period/date is presented right now.
        Don't say anything else about the chart information.
        Don't mention this exact text
      `;

    case "lights":
      if (intent.intensity === "on") {
        return "Say that the lights have been turned on right now";
      }

      return "Say that the lights have been turned off right now";

    case "describe-photo":
      return "Describe the photo.";

    case "parking-logs":
      return "Say you have the parking logs";

    case "people-report":
      return "Say you have the people reports";

    case "live-feed":
      return "Say that the user can view the live feed now.";

    case "no-match":
      return "Apologize to the user you didn't understand or you have't been trained to answer this question/request.";
  }
}

function tryToFixFinalResponseJSON(
  message: string
): z.infer<typeof FinalResponseSchema.Response> {
  if (message.startsWith("Response is not JSON:")) {
    const [, badJsonStr] = message.split("Response is not JSON:");

    try {
      // the LLM sometimes forgets to add a final '}'
      const result = FinalResponseSchema.Response.parse(
        JSON.parse(badJsonStr + "}")
      );

      console.log("success: llm fix message");

      return result;
    } catch (_) {
      console.log("failed: llm fix message");
    }
  }

  return {
    text: "I didn't understand.",
  };
}

async function getFinalResponse(
  originalPrompt: string,
  context: string,
  intent: IntentsResponse
): Promise<z.infer<typeof FinalResponseSchema.Response>> {
  const v = createZodJsonValidator(FinalResponseSchema, "Response");

  const translator = createJsonTranslator(lm, v);

  const result = await translator.translate(
    `
      You are a home assistant. You must help the user by fulfilling his requests.
      The user might ask you questions about the house.

      User prompt: ${intent.intent === "no-match" ? "" : originalPrompt};

      Context: ${context};
    `,
    [
      {
        role: "assistant",
        content: `You must combine the given context and the user intent and generate a response.`,
      },
      { role: "user", content: "Respond only in valid JSON." },
    ]
  );

  if (!result.success) {
    console.error("LLM json error: ", result.message);

    return tryToFixFinalResponseJSON(result.message);
  }

  return result.data;
}

async function getIntent(prompt: string): Promise<IntentsResponse> {
  const v = createZodJsonValidator(IntentsSchema, "Response");

  const translator = createJsonTranslator(lm, v);

  const result = await translator.translate(prompt, [
    { role: "user", content: "Respond only in valid JSON." },
  ]);

  if (!result.success) {
    console.error("First", JSON.stringify(result.message, null, 2));

    return { intent: "no-match" };
  }

  return result.data;
}

async function test(image: string) {
  const response = await fetch("http://192.168.100.82:11435/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: "llava:7b-v1.6-vicuna-q8_0",
      prompt:
        "Give a short description of the image's contents (minimum of 80 words). Only describe/mention what you're very sure about.",
      images: [image],

      stream: false,
      options: {
        num_predict: -1,
      },

      system: `
        You are a smart house assistant using a security camera. You must fullfil the users's requests.
      `,
    }),
  });

  const jsonResp = await response.json();

  return jsonResp.response;
}

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCookie);

fastify.register(fastifySecureSession, {
  // the name of the attribute decorated on the request-object, defaults to 'session'
  sessionName: "session",
  // the name of the session cookie, defaults to value of sessionName
  cookieName: "my-session-cookie",
  // adapt this to point to the directory where secret-key is located
  key: fsSync.readFileSync(path.join(__dirname, "secret-key")),
  // the amount of time the session is considered valid; this is different from the cookie options
  // and based on value wihin the session.
  expiry: 24 * 60 * 60, // Default 1 day
  cookie: {
    // path: "/",
    secure: true,
    sameSite: "none",
    // domain: "pushi.party",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
  },
});

fastify.register(websocket);

let liveFeedListeners: WebSocket[] = [];

const qrClientsCodes = new Map<string, WebSocket>();

async function decodeQR(rawImg: Buffer): Promise<string | undefined | null> {
  try {
    // Load the image with Jimp
    const image = await Jimp.read(rawImg);

    // Get the image data
    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height,
    };

    // Use jsQR to decode the QR code
    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);

    return decodedQR?.data;
  } catch (_) {}
}

async function checkQrCode(image: Buffer) {
  if (qrClientsCodes.size < 1) {
    return;
  }

  const result = await decodeQR(image);

  if (!result) {
    return;
  }

  const socket = qrClientsCodes.get(result);

  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ key: ALLOWED_KEY }));
  }
}

function emitLiveImage(imageBytes: Uint8Array) {
  const openLiveFeedListeners = liveFeedListeners.filter(
    (s) => s.readyState === s.OPEN
  );

  openLiveFeedListeners.forEach((s) => {
    s.send(imageBytes);
  });

  liveFeedListeners = openLiveFeedListeners;
}

// async function createFakeData(fileName: string, fn: () => string | number) {
//   const startingDate = new Date(2024, 0, 0);
//   const endingDate = new Date();

//   let final = "timestamp,value\n";

//   for (
//     let currentDate = startingDate;
//     isBefore(currentDate, endingDate);
//     currentDate = addHours(currentDate, 3)
//   ) {
//     final += `${currentDate.getTime()},${fn()}\n`;
//   }

//   await fs.writeFile(`./data/${fileName}.csv`, final, { encoding: "utf-8" });
// }

// createFakeData("lights", () => Math.random());
// createFakeData("sun-levels", () => Math.random());
// createFakeData("temperatures", () =>
//   Math.floor(Math.random() * (32 - 17 + 1) + 17)
// );
// createFakeData("battery-levels", () => Math.random());

const ALLOWED_KEY = "RANDOM_STUFF";

fastify.post("/login", async (request, reply) => {
  if (typeof request.body !== "string") {
    throw "";
  }

  const body = JSON.parse(request.body);
  const parsedResponse = z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .parse(body);

  if (
    parsedResponse.username === "bobi" &&
    parsedResponse.password === "ne este dor de mm"
  ) {
    return {
      key: ALLOWED_KEY,
    };
  }

  return 404;
});

fastify.register(async function (fastify) {
  fastify.get(
    "/qr",
    {
      websocket: true,
    },
    (socket, request) => {
      socket.on("message", async (message, isBinary) => {
        let parsedMessage: Record<string, string> | undefined;

        try {
          parsedMessage = JSON.parse(message.toString());
        } catch (_) {
          return;
        }

        switch (parsedMessage?.type) {
          case "start-qr-listening":
            liveFeedListeners.push(socket);

            const uuid = uuidv4();

            qrClientsCodes.set(uuid, socket);

            return socket.send(
              JSON.stringify({
                code: uuid,
              })
            );

          default:
            return socket.send("invalid data");
        }
      });
    }
  );
});

fastify.register(async function (fastify) {
  fastify.get(
    "/",
    {
      websocket: true,
    },
    (socket, request) => {
      const parsedQuery = z.object({ key: z.string() }).parse(request.query);

      if (parsedQuery.key !== ALLOWED_KEY) {
        socket.close();

        throw "";
      }

      socket.on("message", async (message, isBinary) => {
        await fs.appendFile(
          "./data/lights.csv",
          `${Date.now()},${Math.random()}\n`,
          {
            encoding: "utf-8",
          }
        );

        if (isBinary && message instanceof Buffer) {
          // messages from beagle
          const messageType = String.fromCharCode(message[0]);
          const binaryData = message.buffer.slice(1);

          switch (messageType) {
            case "i":
              latestImageBytes = new Uint8Array(binaryData);

              checkQrCode(Buffer.from(binaryData));

              return emitLiveImage(latestImageBytes);

            case "l":
              await fs.appendFile(
                "./data/lights.csv",
                `${Date.now()},${Math.random()}`,
                {
                  encoding: "utf-8",
                }
              );

              break;
          }
        }

        let parsedMessage: Record<string, string> | undefined;

        try {
          parsedMessage = JSON.parse(message.toString());
        } catch (_) {
          return;
        }

        switch (parsedMessage?.type) {
          case "start-live-feed":
            liveFeedListeners.push(socket);

            return;

          default:
            return socket.send("invalid data");
        }
      });
    }
  );
});

fastify.post("/", async function handler(request, reply) {
  if (typeof request.body !== "string") {
    throw "";
  }

  const body = z
    .object({
      prompt: z.string(),
      key: z.string(),
    })
    .parse(JSON.parse(request.body));

  if (body.key !== ALLOWED_KEY) {
    throw "";
  }

  const latestImageBytesCopy = latestImageBytes;

  const intent = await getIntent(body.prompt);

  const useHardcodedImage = true;

  if (
    intent.intent === "describe-photo" &&
    (latestImageBytesCopy || useHardcodedImage)
  ) {
    const latestEncodedImage =
      useHardcodedImage || !latestImageBytesCopy
        ? fsSync.readFileSync("./teste.jpg", {
            encoding: "base64",
          })
        : Buffer.from(latestImageBytesCopy).toString("base64");

    const response = await test(latestEncodedImage);

    return { response, intent, image: latestEncodedImage };
  } else {
    const finalPromptContext = getFinalPromptContext(intent);

    const finalResponse = await getFinalResponse(
      body.prompt,
      finalPromptContext,
      intent
    );

    return { response: finalResponse.text, intent };
  }
});

async function main() {
  // Run the server!
  try {
    await fastify.register(cors, {});

    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
