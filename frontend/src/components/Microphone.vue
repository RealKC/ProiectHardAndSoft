<template>
  <q-btn
    flat
    round
    icon="sym_r_mic"
    @click="useVoice"
    :color="loadingRecognition ? 'primary' : 'grey'"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  prompt: string;
  submitFn?: () => void;
  loadingPrompt: boolean;
}>();

const emit = defineEmits(["update:prompt", "update:loadingPrompt"]);

const prompt = computed({
  set: (val) => emit("update:prompt", val),
  get: () => props.prompt,
});

const loadingPrompt = computed({
  set: (val) => emit("update:loadingPrompt", val),
  get: () => props.loadingPrompt,
});

const loadingRecognition = ref(false);

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.interimResults = true;
recognition.maxAlternatives = 1;

recognition.onresult = (event) => {
  prompt.value = event.results[0][0].transcript;
};

recognition.onspeechend = () => {
  recognition.stop();

  loadingPrompt.value = false;
  loadingRecognition.value = false;

  if (props.submitFn) {
    props.submitFn();
  }
};

function useVoice() {
  if (loadingRecognition.value) {
    recognition.stop();

    loadingPrompt.value = false;
    loadingRecognition.value = false;
  } else {
    recognition.start();

    loadingPrompt.value = true;
    loadingRecognition.value = true;
  }
}
</script>
