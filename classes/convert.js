module.exports = class Convert {
  constructor() {}

  convert(time) {
    let [hours, minutes, seconds] = time.split(":");
    if (time.includes("PM") && hours !== "12") {
      hours = String(Number(hours) + 12);
    }
    if (time.includes("AM") && hours === "12") {
      hours = "00";
    }
    if (time.includes("AM") && hours !== "12") {
      hours = `0${hours}`;
    }

    return `${hours}:${minutes}:${seconds
      .replace(" AM", "")
      .replace(" PM", "")}`;
  }

  time() {
    let options = {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      },
      time = new Intl.DateTimeFormat([], options);
    return this.convert(time.format(new Date()));
  }
};
