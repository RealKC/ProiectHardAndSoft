<template>
  <Line
    style="min-height: 400px"
    id="my-chart-id"
    :options="chartOptions"
    :data="chartData"
  />
</template>

<script setup lang="ts">
import { Line } from "vue-chartjs";
import { generateChartData } from "./../../../common/lib/charts";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  LineElement,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  ChartOptions,
  ChartData,
} from "chart.js";
import { ChartTimePeriod } from "../../../common/types/intents";
import { computed } from "vue";
import { addDays, addWeeks, addMonths, addYears, set } from "date-fns";
import { DateValues } from "date-fns/fp";

ChartJS.register(
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

const props = defineProps<{
  period?: Zod.infer<typeof ChartTimePeriod> | null;
}>();

const data = computed(() => {
  if (!props.period) {
    return generateChartData(addDays(new Date(), -1), new Date());
  }

  if (props.period.type === "relative") {
    let firstDate = new Date();

    if (props.period.days) {
      firstDate = addDays(firstDate, -1 * props.period.days);
    }

    if (props.period.weeks) {
      firstDate = addWeeks(firstDate, -1 * props.period.weeks);
    }

    if (props.period.months) {
      firstDate = addMonths(firstDate, -1 * props.period.months);
    }

    if (props.period.years) {
      firstDate = addYears(firstDate, -1 * props.period.years);
    }

    return generateChartData(firstDate, new Date());
  }

  if (props.period.type === "exact") {
    const referenceDate = new Date();

    const firstDateValues: DateValues = {};
    const secondDateValues: DateValues = {};

    if (props.period.startingDay) {
      firstDateValues.date = props.period.startingDay;
    }
    if (props.period.startingMonth) {
      firstDateValues.month = props.period.startingMonth;
    }
    if (props.period.startingYear) {
      firstDateValues.year = props.period.startingYear;
    }

    if (props.period.endingDay) {
      secondDateValues.date = props.period.endingDay;
    }
    if (props.period.endingMonth) {
      secondDateValues.month = props.period.endingMonth;
    }
    if (props.period.endingYear) {
      secondDateValues.year = props.period.endingYear;
    }

    const firstDate = set(referenceDate, firstDateValues);
    const secondDate = set(referenceDate, secondDateValues);

    return generateChartData(firstDate, secondDate);
  }

  return generateChartData(addDays(new Date(), -1), new Date());
});

const chartData = computed<ChartData<"line">>(() => ({
  labels: data.value.label,
  datasets: [
    {
      label: "",
      data: data.value.dataset,
      borderColor: "white",
      tension: 0.2,
      pointStyle: false,
    },
  ],
}));

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    intersect: false,
  },
  scales: {
    x: {
      ticks: {
        autoSkip: true,
        maxTicksLimit: 15,
      },
    },
  },

  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
};
</script>
