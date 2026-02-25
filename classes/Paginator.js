import { MessageFlags, ComponentType } from "discord.js";
const activeCollectors = new Set();

export class Paginator {
  constructor(
    pages = [],
    { filter, timeout } = {
      timeout: 5 * 6e4,
    },
  ) {
    this.pages = Array.isArray(pages) ? pages : [];
    this.timeout = Number(timeout) || 5 * 6e4;
    this.page = 0;
    this.collector = null;
  }

  add(page) {
    this.pages.push(page);
    return this;
  }

  setEndPage(page) {
    if (page) this.endPage = page;
    return this;
  }

  setTransform(fn) {
    const _pages = [];
    let i = 0;
    const ln = this.pages.length;
    for (const page of this.pages) {
      _pages.push(fn(page, i, ln));
      i++;
    }
    this.pages = _pages;
    return this;
  }
  
  stop() {
    if (this.collector) {
      this.collector.stop();
      this.collector = null;
    }
  }

  async start(channel, update = false) {
    if (!this.pages.length) return;

    for (const collector of activeCollectors) {
      collector.stop();
    }
    activeCollectors.clear();

    let msg;
    if (update) {
      msg = await channel.update({
        components: [this.pages[0]],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    } else {
      msg = await channel.reply({
        components: [this.pages[0]],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    }

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1_000_000,
    });

    this.collector = collector;
    activeCollectors.add(collector); 

    collector.on("collect", async (inter) => {
      try {
        if (inter.isButton()) {
          if (!inter) return;

          switch (inter.customId) {
            case "first":
              if (this.page === 0) {
                return await inter.deferUpdate();
              } else {
                await inter.update({
                  components: [this.pages[0]],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });
                return (this.page = 0);
              }
            case "prev":
              if (this.pages[this.page - 1]) {
                return await inter.update({
                  components: [this.pages[--this.page]],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });
              } else {
                return await inter.deferUpdate();
              }
            case "next":
              if (this.pages[this.page + 1]) {
                return await inter.update({
                  components: [this.pages[++this.page]],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });
              } else {
                return await inter.deferUpdate();
              }
            case "last":
              if (this.page === this.pages.length - 1) {
                return await inter.deferUpdate();
              } else {
                await inter.update({
                  components: [this.pages[this.pages.length - 1]],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });
                return (this.page = this.pages.length - 1);
              }
          }
        }
      } catch (e) {
        return;
      }
    });

    collector.on("end", () => {
      activeCollectors.delete(collector);
      this.collector = null;
    });
  }
}