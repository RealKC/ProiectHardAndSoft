import { createApp } from "vue";
import { Quasar, Notify } from "quasar";
import quasarIconSet from "quasar/icon-set/material-symbols-rounded";

// Import icon libraries
import "@quasar/extras/material-symbols-rounded/material-symbols-rounded.css";

// Import Quasar css
import "quasar/src/css/index.sass";

import "./css/styles.css";

// Assumes your root component is App.vue
// and placed in same folder as main.js
import App from "./App.vue";

const myApp = createApp(App);

myApp.use(Quasar, {
  plugins: {
    Notify,
  }, // import Quasar plugins and add here
  iconSet: quasarIconSet,
  config: {
    dark: true,
  },
});

// Assumes you have a <div id="app"></div> in your index.html
myApp.mount("#app");
