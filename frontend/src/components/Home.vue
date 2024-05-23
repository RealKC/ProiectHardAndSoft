<template>
  <div class="q-mt-md">
    <div class="row q-col-gutter-sm items-center">
      <div class="col-xs-grow">
        <q-form ref="promptFormEl" @submit="submit">
          <q-input
            v-model="prompt"
            outlined
            class="fit"
            :disable="loadingPrompt"
            :loading="loadingPrompt"
            label="Ask anything"
            hide-bottom-space
            autofocus
          >
            <template v-slot:prepend>
              <q-icon name="sym_r_search" />
              <!-- ✨ -->
            </template>

            <template v-slot:append>
              <q-btn
                type="submit"
                size="md"
                @click="promptFormEl?.submit()"
                round
                flat
                icon="sym_r_send"
              />
            </template>
          </q-input>
        </q-form>
      </div>

      <div v-if="supportedVoice" class="col-xs-shrink">
        <Microphone
          v-model:prompt="prompt"
          v-model:loading-prompt="loadingPrompt"
          :submitFn="submit"
        />
      </div>
    </div>
  </div>

  <div v-if="response && intentResponse" class="q-mt-md">
    <q-card bordered flat class="fit">
      <q-card-section>
        <div>
          <div class="row q-col-gutter-md items-bottom">
            <div
              v-if="!!previewImage"
              :class="{
                'col-xs-12 col-sm-6': !fullScreenPreview,
                'fullscreen q-pa-none': fullScreenPreview,
              }"
            >
              <div class="fit" style="position: relative">
                <img
                  :src="previewImage"
                  style="object-fit: cover"
                  class="fit"
                />

                <div
                  style="position: absolute; top: 0; left: 0"
                  class="fit hover-effects2"
                >
                  <div class="q-pa-md iconPM">
                    <q-icon
                      name="sym_r_videocam"
                      size="sm"
                      color="red"
                    ></q-icon>
                  </div>
                </div>

                <div style="position: absolute; right: 0; top: 0">
                  <div class="q-pa-md text-right">
                    <div>
                      {{ currentDate }}
                    </div>
                    <div>
                      {{ currentHour }}
                    </div>
                  </div>
                </div>

                <div style="position: absolute; bottom: 0; right: 0">
                  <div class="q-pa-md">
                    <q-btn
                      flat
                      round
                      dense
                      :icon="
                        fullScreenPreview
                          ? 'sym_r_fullscreen_exit'
                          : 'sym_r_fullscreen'
                      "
                      @click="fullScreenPreview = !fullScreenPreview"
                    ></q-btn>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="col-xs-12"
              :class="{ 'col-sm-6': !!imageBase64 || !!previewImage }"
            >
              <div class="col-xs-12 text-body2">> {{ lastPrompt }}</div>

              <div class="text-body1 q-mt-sm">
                {{ response }}
              </div>

              <div v-if="!!previewImage">
                <div class="q-mt-md text-body2">Quick actions:</div>

                <q-list class="q-mt-sm" bordered separator>
                  <q-item clickable v-ripple>
                    <q-item-section avatar>
                      <q-avatar
                        color="primary"
                        text-color="white"
                        icon="sym_r_directions_car"
                      />
                    </q-item-section>

                    <q-item-section>Open barrier</q-item-section>
                  </q-item>

                  <q-item clickable v-ripple>
                    <q-item-section avatar>
                      <q-avatar
                        color="yellow-8"
                        text-color="white"
                        icon="sym_r_notification_important"
                      />
                    </q-item-section>

                    <q-item-section>Turn on lights</q-item-section>
                  </q-item>
                </q-list>

                <div class="q-mt-md text-body2">Emergency:</div>

                <q-list class="q-mt-sm" bordered separator>
                  <q-item clickable v-ripple>
                    <q-item-section avatar>
                      <q-avatar
                        color="orange"
                        text-color="white"
                        icon="sym_r_volume_up"
                      />
                    </q-item-section>

                    <q-item-section>Play loud alarm</q-item-section>
                  </q-item>

                  <q-item clickable v-ripple>
                    <q-item-section avatar>
                      <q-avatar
                        color="red"
                        text-color="white"
                        icon="sym_r_notification_important"
                      />
                    </q-item-section>

                    <q-item-section>Call police</q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>

            <div v-if="!!imageBase64" class="col-xs-12 col-sm-6">
              <img
                :src="`data:image/jpeg;base64, ${imageBase64}`"
                class="fit"
                style="object-fit: cover"
              />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>

  <div
    v-if="
      intentResponse &&
      (intentResponse.intent === 'battery_level' ||
        intentResponse.intent === 'sun_intensity' ||
        intentResponse.intent === 'house_lighting_level' ||
        intentResponse.intent === 'temperature') &&
      intentResponse.data.type === 'chart'
    "
    class="q-mt-md"
  >
    <q-card bordered flat class="fit">
      <q-card-section>
        <Chart :period="intentResponse.data.timePeriod" />
      </q-card-section>
    </q-card>
  </div>

  <div class="q-mt-xl text-h6">Examples:</div>

  <div class="q-mt-md">
    <div class="row q-col-gutter-md">
      <div v-for="(example, i) in examples" :key="i" class="col-xs-12 col-md-6">
        <q-card
          bordered
          flat
          class="fit hover-effects cursor-pointer"
          v-ripple
          @click="
            prompt = example.body;
            submit();
          "
        >
          <q-card-section>
            <div class="text-h6 text-medium">
              {{ example.title }}
            </div>

            <div class="q-mt-md text-body1">
              {{ example.body }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Response } from "../../../common/types/intents";
import Chart from "./Chart.vue";
import Microphone from "./Microphone.vue";
import { QForm } from "quasar";
import { format } from "date-fns";

const props = defineProps<{ apiKey: string }>();

const prompt = ref("");

const fullScreenPreview = ref(false);
const loadingPrompt = ref(false);

const imageBase64 = ref<string | undefined>();
const response = ref<string | undefined>();
const summary = ref<string | undefined>();
const intentResponse = ref<Response | undefined>();
const promptFormEl = ref<QForm | undefined>();

const previewImage = ref<string | undefined>();

const currentDate = ref("");
const currentHour = ref("");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList =
  window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent =
  window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

const supportedVoice: boolean =
  !!SpeechRecognition && !!SpeechGrammarList && !!SpeechRecognitionEvent;

const examples = [
  {
    title: "🔋 Battery",
    body: "What's the battery level?",
  },
  {
    title: "🌞📈 Sun chart",
    body: "How was the sun in the last 7 days?",
  },
  {
    title: "🧑‍💼 People",
    body: "Was there any activity in front of the house?",
  },
  {
    title: "📷 Photo",
    body: "Take a photo and describe what's in the image",
  },
  {
    title: "🌡️ Temperature",
    body: "Is it cold inside the house?",
  },
  {
    title: "💡 Lights",
    body: "Turn off the lights",
  },
  {
    title: "📽️ Camera live feed",
    body: "Show the camera live feed",
  },
  {
    title: "🪫 Battery chart",
    body: "How did the battery perform between 10 March 2024 and 20 May 2024?",
  },
  {
    title: "🚗 Parking spot",
    body: "Show me the parking logs",
  },
  {
    title: "🪫 Battery chart",
    body: "How does the battery perform between 10 March 2024 and 20 May 2024?",
  },
];

const lastPrompt = ref<string | undefined>();

async function submit() {
  loadingPrompt.value = true;

  window.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });

  const res = await fetch("https://houseapi.pushi.party/", {
    method: "POST",
    body: JSON.stringify({
      key: props.apiKey,
      prompt: prompt.value,
    }),
  });

  const jsonResp = await res.json();

  lastPrompt.value = prompt.value;
  response.value = jsonResp.response;
  imageBase64.value = jsonResp.image;
  summary.value = jsonResp.intent.intent;
  intentResponse.value = jsonResp.intent as Response;

  console.log(imageBase64.value);

  const utterance = new SpeechSynthesisUtterance(response.value);

  speechSynthesis.speak(utterance);

  prompt.value = "";

  loadingPrompt.value = false;
}

let wsInstance: WebSocket | undefined;

watch(intentResponse, (intent) => {
  if (intent?.intent === "live-feed") {
    return mountWebsocket();
  }

  if (wsInstance) {
    wsInstance.close();
    previewImage.value = undefined;
  }
});

function mountWebsocket() {
  if (wsInstance) {
    wsInstance.close();
    previewImage.value = undefined;
  }

  const wsc = new WebSocket(`wss://houseapi.pushi.party/?key=${props.apiKey}`);

  wsc.onopen = () => {
    wsc?.send(
      JSON.stringify({
        type: "start-live-feed",
      })
    );

    wsc.onmessage = (e) => {
      const d = new Date();

      currentDate.value = format(d, "dd.MM.yyyy");
      currentHour.value = format(d, "HH:mm:ss");

      previewImage.value = URL.createObjectURL(e.data);
    };
  };

  wsc.onclose = () => {
    previewImage.value = undefined;
  };

  wsInstance = wsc;
}
</script>

<style>
.hover-effects {
  transition: border 0.15s ease-out;
}

.hover-effects:hover {
  border-color: var(--q-white);
}

.hover-effects2 {
  transition: all 0.2s ease-out;
  background: rgb(255, 255, 255);
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0) 80%,
    rgba(0, 0, 0, 1) 100%
  );
}

.iconPM {
  animation: blink 0.69s ease-in infinite;
}

@keyframes blink {
  from,
  to {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
