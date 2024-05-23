import { z } from "zod";

const NaturalNumber = z
  .number()
  .positive()
  .int()
  .describe("A natural number, only positive numbers are allowed");

const Day = NaturalNumber.min(1)
  .max(31)
  .describe("A normal day of the month, must be between 1 and 31");

const Month = NaturalNumber.min(1).max(12).describe(`
  A month, must be between 1 and 12,
  if the user says the name of the month (eg. January) translate it into the corresponding number
`);

const Week = NaturalNumber.describe(`
  A week
`);

const Year = NaturalNumber.describe(`
  A year
`);

export const ChartTimePeriod = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("exact"),
      startingDay: Day.nullish().describe("If the user mentions a day"),
      startingMonth: Month.nullish().describe("If the user mentions a month"),
      startingYear: Year.nullish().describe("If the user mentions a year"),
      endingDay: Day.nullish().describe("A second day has been mentioned"),
      endingMonth: Month.nullish().describe(
        "A second month has been mentioned"
      ),
      endingYear: Year.nullish().describe("A second year has been mentioned"),
    }).describe(`
        The user mentions a exact time period

        July 2024 - March 2025
        March 2019 - 24th March 2023
        12th May 2003, 15th May 2003
        between 6th January and 15th January
        01.10.2009 - 01.11.2011
        1.3.2001 - 9.5.2001
        years 2010 - 2011
        period of 2003-2009
        2013-2014
        2004 and 2010
        from 3 may 2013 to 5 may 2024
        July 2021
        January 2019
        12th May 2003
        6th January
        9.10.2009
        1.3.2001
      `),
    z.object({
      type: z.literal("relative"),
      days: Day.nullish().describe("If the user mentions any number of days"),
      weeks: Week.nullish().describe(
        "If the user mentions any number of weeks"
      ),
      months: Month.nullish().describe(
        "If the user mentions any number of months"
      ),
      years: Year.nullish().describe(
        "If the user mentions any number of years"
      ),
    }).describe(`
        The user mentions a relative date

        three days ago
        one day ago
        one month ago
        three days 
        the past 2 years
        last 4 weeks
        today
        yesterday
      `),
  ])
  .describe(
    "If the user mentions a date or time period break it down by type (exact or relative)"
  );

export const ChartOrValue = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("value"),
  }),
  z.object({
    type: z.literal("chart"),
    timePeriod: ChartTimePeriod.nullish(),
  }),
]).describe(`
  Use type "chart" if the user mentions a chart or describes a period of time.
  Use type "value" if the user wants the current value.
`);

export const LightsResponse = z.object({
  intent: z.literal("lights"),
  intensity: z.enum(["on", "off"]),
}).describe(`
  turn on the lights
  turn off the lights
  lights on
  lights off
  kill the lights
  make it so its no longer dark
`);

export const BatteryResponse = z.object({
  intent: z.literal("battery_level"),
  data: ChartOrValue,
}).describe(`
  current battery level
  house battery level
  battery chart over time
  battery chart this week
  battery levels this month
  id like to see the history of the battery charge
  battery levels over time
  id like to see the statistics for battery levels
`);

export const SunResponse = z.object({
  intent: z.literal("sun_intensity"),
  data: ChartOrValue,
}).describe(`
  current sun intensity
  current sun level
  house sun intensity level
  sun intensity
  current sun intensity level
  sun intensity over time
  sun intensity this week
  sun intensity chart over time
  sun intensity chart this week
  sun levels this month
  id like to see the history of the sun power intensity
  sun power intensity levels over time
  id like to see the statistics for sun intensity levels
`);

export const NoMatchResponse = z.object({
  intent: z.literal("no-match"),
}).describe(`
    If the message doesn't match any of the examples provided respond with this.
    If the user's message is explicit or offensive respond with 'no-match'.
    If the user's message is not in english refuse to answer and respond with 'no-match'
  `);

export const DescribePhotoResponse = z.object({
  intent: z.literal("describe-photo"),
}).describe(`
  The user asks for a description via the web camera of the house.
  The user asks for a photo with the camera. 
  The user asks to take a photo. 
  The user asks for a description with a photo.
`);

export const TemperatureResponse = z.object({
  intent: z.literal("temperature"),
  data: ChartOrValue,
}).describe(`
  The user asks for the current temperature, temperature chart, or if it's cold or warm inside the house.
  The user might ask how to dress inside the house based on the temperature. This is "data.type == 'value'"
`);

export const HouseLightingResponse = z.object({
  intent: z.literal("house_lighting_level"),
  data: ChartOrValue,
}).describe(`
  The user asks for the current (house) light levels, (house) light/lighting levels chart, or if it's dark inside the house.
  The user asks if it's bright or dark inside the house.

  Examples:

  house light level chart
  house lighting level chart
  light level chart
  house lighting chart
  current house lighting
  
`);

export const PeopleResponse = z.object({
  intent: z.literal("people-report"),
}).describe(`
  The user asks for a people report
`);

export const LiveFeedResponse = z.object({
  intent: z.literal("live-feed"),
}).describe(`
  The user asks for a live feed
`);

export const ParkingLogsResponse = z.object({
  intent: z.literal("parking-logs"),
}).describe(`
  The user asks for parking logs
`);

export const StartAlarmResponse = z.object({
  intent: z.literal("start-alarm"),
}).describe(`
  start a house alarm
  make beep beep beep
  beep beep
  scare the wild animals
  start a loud sound
  make a loud noise
  im not safe, there are bears outside the house
`);

export const BedtimeStoryResponse = z.object({
  intent: z.literal("bedtime-story"),
}).describe(`
  bedtime story
  tell me bedtime story
  i have been having bad dreams
  my kids cant sleep
  my pet can't sleep, tell time a bedtime story
  i can't sleep
  i cant sleep well
  help me sleep
`);

export const WelcomeResponse = z.object({
  intent: z.literal("welcome"),
}).describe(`
  Hello
  What can you do?
  tell me something you can do
  Who are you
  What's this about?
  How smart is this home?
  What is your name?
`);

export const Response = z
  .discriminatedUnion("intent", [
    LightsResponse,
    BatteryResponse,
    DescribePhotoResponse,
    TemperatureResponse,
    PeopleResponse,
    ParkingLogsResponse,
    WelcomeResponse,
    NoMatchResponse,
    LiveFeedResponse,
    SunResponse,
    HouseLightingResponse,
    StartAlarmResponse,
    BedtimeStoryResponse,
  ])
  .describe("A schema definition for responses");

export type Response = z.infer<typeof Response>;

export const IntentsSchema = {
  Response,
  DescribePhotoResponse,
  TemperatureResponse,
  NoMatchResponse,
  LightsResponse,
  PeopleResponse,
  StartAlarmResponse,
  WelcomeResponse,
  BatteryResponse,
  LiveFeedResponse,
  ParkingLogsResponse,
  ChartOrValue,
  SunResponse,
  ChartTimePeriod,
  NaturalNumber,
  HouseLightingResponse,
  BedtimeStoryResponse,
  Day,
  Month,
  Week,
  Year,
};
