<template>
  <div style="margin-left: auto; margin-right: auto; max-width: 600px">
    <q-card bordered flat class="fit">
      <q-card-section v-if="qrCode">
        <q-form @submit="login">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 text-h6">Login with QRCode</div>

            <div class="col-xs-12">
              <canvas class="fit" ref="canvasEl"></canvas>
            </div>

            <div class="col-xs-12">
              <q-btn @click="toggleView(false)" class="fit" no-caps outline>
                <q-icon name="sym_r_arrow_back" class="q-mr-sm" />

                Back to login
              </q-btn>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-section v-else>
        <q-form @submit="login">
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 text-h6">Welcome!</div>

            <div class="col-xs-12">
              <q-input
                v-model="username"
                outlined
                :rules="[(val) => !!val]"
                hide-bottom-space
                label="Username"
              ></q-input>
            </div>

            <div class="col-xs-12">
              <q-input
                v-model="password"
                type="password"
                outlined
                :rules="[(val) => !!val]"
                hide-bottom-space
                label="Password"
              ></q-input>
            </div>

            <div class="col-xs-12 col-sm-6">
              <q-btn
                :loading="loading"
                type="submit"
                class="fit"
                no-caps
                outline
              >
                <q-icon name="sym_r_key" class="q-mr-sm" />

                Login
              </q-btn>
            </div>

            <div class="col-xs-12 col-sm-6">
              <q-btn @click="toggleView(true)" class="fit" no-caps outline>
                <q-icon name="sym_r_qr_code_scanner" class="q-mr-sm" />

                Login with QR
              </q-btn>
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { computed, ref, watchEffect } from "vue";
import { z } from "zod";
import QRCode from "qrcode";

const username = ref<string | undefined>();
const password = ref<string | undefined>();

const loading = ref(false);

const qrCode = ref(false);

const { notify } = useQuasar();

const props = defineProps<{
  apiKey: string | undefined | null;
}>();

const emit = defineEmits(["update:apiKey"]);

const apiKey = computed({
  set: (val) => emit("update:apiKey", val),
  get: () => props.apiKey,
});

const canvasEl = ref<HTMLCanvasElement | undefined>();
const qrCodeData = ref<string | undefined>();

watchEffect(() => {
  if (canvasEl.value && qrCodeData.value) {
    QRCode.toCanvas(canvasEl.value, qrCodeData.value, function (error) {
      if (error) console.error(error);
      console.log("success!");
    });
  }
});

let wsInstance: WebSocket | undefined;

function toggleView(value: boolean) {
  qrCode.value = value;
  qrCodeData.value = undefined;

  if (value) {
    mountQRCodeWebsocket();
  } else {
    wsInstance?.close();
  }
}

function mountQRCodeWebsocket() {
  if (wsInstance) {
    wsInstance.close();
    qrCodeData.value = undefined;
  }

  const wsc = new WebSocket(`wss://houseapi.pushi.party/qr`);

  wsc.onopen = () => {
    wsc?.send(
      JSON.stringify({
        type: "start-qr-listening",
      })
    );

    wsc.onmessage = (e) => {
      const d = z
        .object({
          code: z.string().nullish(),
          key: z.string().nullish(),
        })
        .parse(JSON.parse(e.data));

      if (d.code) {
        qrCodeData.value = d.code;
      }

      if (d.key) {
        apiKey.value = d.key;
      }
    };
  };

  wsc.onclose = () => {
    qrCodeData.value = undefined;
    qrCode.value = false;
  };

  wsInstance = wsc;
}

async function login() {
  loading.value = true;

  try {
    const response = await fetch("https://houseapi.pushi.party/login", {
      method: "POST",
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    const jsonResponse = await response.json();

    const parsedResponse = z
      .object({
        key: z.string(),
      })
      .parse(jsonResponse);

    apiKey.value = parsedResponse.key;

    notify({
      message: "Login successful",
    });
  } catch (_) {
    password.value = "";

    notify({
      message: "Invalid credentials",
    });
  }

  loading.value = false;
}
</script>
