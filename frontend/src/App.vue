<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="bg-dark text-white">
      <q-toolbar>
        <q-toolbar-title> MițCasa </q-toolbar-title>

        <q-btn class="q-mr-sm" icon="sym_r_help" flat round></q-btn>
        <q-btn icon="sym_r_settings" flat round></q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container class="q-px-md q-pb-md">
      <div
        style="margin-left: auto; margin-right: auto; max-width: 1000px"
        class="q-mt-md"
      >
        <Home :api-key="apiKey" v-if="apiKey" />
        <Login v-model:api-key="apiKey" v-else />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Login from "./components/Login.vue";
import Home from "./components/Home.vue";

const apiKey = ref<string | undefined>();
</script>
