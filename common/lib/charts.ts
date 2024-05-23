import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  isBefore,
} from "date-fns";

export function generateChartData(startingDate: Date, endingDate: Date) {
  const label: string[] = [];
  const dataset: number[] = [];

  const datesDiff = differenceInCalendarDays(endingDate, startingDate);

  console.log(datesDiff);

  const addStep = (() => {
    if (datesDiff <= 3) {
      return addHours;
    }

    if (datesDiff <= 60) {
      return addDays;
    }

    if (datesDiff <= 200) {
      return addWeeks;
    }

    return addMonths;
  })();

  for (
    let currentDate = startingDate;
    isBefore(currentDate, endingDate);
    currentDate = addStep(currentDate, 1)
  ) {
    const dateFormatted = format(
      currentDate,
      `dd/MM/yyyy${datesDiff <= 3 ? " HH:mm" : ""}`
    );

    label.push(dateFormatted);
    dataset.push(Math.random() * 100);
  }

  return { label, dataset };
}
