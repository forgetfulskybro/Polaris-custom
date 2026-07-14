const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  MessageFlags,
  AttachmentBuilder,
} = require("discord.js");
const captcha = require("../models/captcha.js");
const crypto = require("node:crypto");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = class Captcha {
  randomString(length = 6) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(crypto.randomInt(0, charactersLength - 1));
      counter += 1;
    }
    return result;
  }

  generateCaptchaImage(code) {
    const width = 300;
    const height = 100;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = this.getRandomColor(100, 200);
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = this.getRandomColor(150, 255);
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const x = charWidth * (i + 0.5);
      const y = height / 2;
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.font = `${Math.random() * 20 + 30}px Arial`;
      ctx.fillStyle = this.getRandomColor(150, 255);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = this.getRandomColor(150, 255);
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    return canvas.toBuffer("image/png");
  }

  getRandomColor(min, max) {
    const r = Math.floor(Math.random() * (max - min) + min);
    const g = Math.floor(Math.random() * (max - min) + min);
    const b = Math.floor(Math.random() * (max - min) + min);
    return `rgb(${r},${g},${b})`;
  }

  async verify(interaction) {
    const modalObject = {
      title: `Captcha Verification`,
      custom_id: "checkCaptcha",
      components: [
        {
          type: 18,
          label: "Do you agree to the server's rules?",
          required: true,
          component: {
            type: 21,
            custom_id: "checkbox",
            options: [
              { value: "disagree", label: "I disagree" },
              { value: "agree", label: "I agree" },
            ],
          },
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              style: 1,
              max_length: 6,
              required: true,
              custom_id: "input",
              label: "Code",
              placeholder: `Input your captcha code here to be verified.`,
            },
          ],
        },
      ],
    };

    interaction.showModal(modalObject).catch(() => {});
    interaction
      .awaitModalSubmit({
        filter: (mInter) => mInter.customId === modalObject.custom_id,
        time: 180000,
      })
      .then(async (modalInteraction) => {
        let rules = modalInteraction.components[0].component.value;
        let code = modalInteraction.components[1].components[0].value;

        if (rules == "disagree") {
          await captcha.deleteOne({ user: interaction.user.id });

          return modalInteraction
            .reply({
              content: `${interaction.client.config.emojis.redTick} You've been kicked for not agreeing to the server rules.`,
            })
            .then(() => {
              interaction.client.guilds.cache
                .get(interaction.client.config.mainGuild)
                .members.kick(
                  interaction.user.id,
                  "User did not agree to server rules",
                );
            });
        }

        const verifyCaptcha = await captcha.findOne({
          code,
          user: interaction.user.id,
        });

        if (!verifyCaptcha) {
          await captcha.deleteOne({ user: interaction.user.id });

          return modalInteraction
            .reply({
              content: `${interaction.client.config.emojis.redTick} That's an invalid captcha code.`,
            })
            // .then(() => {
            //   interaction.client.guilds.cache
            //     .get(interaction.client.config.mainGuild)
            //     .members.kick(
            //       interaction.user.id,
            //       "User did not use correct captcha code",
            //     );
            // });
        }

        interaction.client.guilds.cache
          ?.get(interaction.client.config.mainGuild)
          ?.members.cache.get(interaction.user.id)
          ?.roles.add(interaction.client.config.verificationRole)
          .catch((e) => {
            console.log(e);
          });

        await captcha.findOneAndDelete({ code: code });
        const channel = interaction.client.channels.cache.get(interaction.client.config.verificationChannel);

        let thread = channel.threads.cache.get(
          interaction.client.config.thread,
        );
        if (!thread)
          thread = channel.threads
            .fetchArchived()
            .then((t) => t.threads.get(interaction.client.config.thread));

        thread.send({ content: `<@${interaction.user.id}> was approved.` });
        return modalInteraction
          .reply({
            content: `${modalInteraction.client.config.emojis.greenTick} Verified your account!`,
            flags: MessageFlags.Ephemeral,
          })
          .catch((e) => {
            console.log(e);
          });
      }).catch(() => {});
  }

  whyVerify(interaction) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent('## Why Verify?\n\nVerification helps protect our server from automated bots and spam accounts. By completing a simple captcha, you prove you\'re a real person.')
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }

  async start(interaction) {
    if (interaction.member.roles.cache.has(interaction.client.config.verificationRole))
      return interaction.deferUpdate();
    const user = await captcha.findOne({ user: interaction.user.id });
    if (user) return interaction.deferUpdate();
    const code = this.randomString();
    await new captcha({
      code: code,
      user: interaction.user.id,
    }).save();

    const imageBuffer = this.generateCaptchaImage(code);
    const captchaAttachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });
    
    const mainContainer = new ContainerBuilder()    
      .addTextDisplayComponents(
        (text) => text.setContent('## **Captcha Verification**\nSolve the captcha to join the server')
      )

      .addMediaGalleryComponents((gallery) =>
        gallery.addItems((item) =>
          item
            .setURL('attachment://captcha.png')
            .setDescription('Solve this captcha')
        )
      )

      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('submit')
            .setLabel('Submit Answer')
            .setStyle("Secondary"),
          new ButtonBuilder()
            .setCustomId('whyVerify')
            .setLabel('Why do I need to verify?')
            .setStyle("Secondary")
        )
      );

    let dm = false;
    await interaction.user
      .send({
        components: [mainContainer],
        files: [captchaAttachment],
        flags: MessageFlags.IsComponentsV2,
      })
      .catch((e) => {
        console.log(e);
        dm = true;
      });

    if (dm) {
      await captcha.deleteOne({ user: interaction.user.id });
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `${interaction.client.config.emojis.redTick} Unable to send you a message for verification. Make sure to turn your Direct Messages on for this server.`,
      });
    }

    const interval = setInterval(async () => {
      let capt = await captcha.findOne({ user: interaction.user.id });
      if (!capt) return;
      clearInterval(interval);
      await captcha.deleteOne({ user: interaction.user.id });
      interaction.user
        .send({
          content: `${interaction.client.config.emojis.redTick} You've been kicked for not providing a code in time.`,
        })
        .catch(() => {});

      interaction.client.guilds.cache
        .get(interaction.client.config.mainGuild)
        .members.kick(interaction.user.id, "User did not complete captcha");
    }, 360000);

    interaction.deferUpdate();
  }
};
