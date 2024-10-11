const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const captcha = require("../models/captcha.js");
const crypto = require("node:crypto");

module.exports = class Captcha {
  randomString(length = 5) {
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

  async verify(interaction) {
    const modalObject = {
      title: `Captcha System`,
      custom_id: "checkCaptcha",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              style: 1,
              max_length: 5,
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
        let code = modalInteraction.components[0].components[0].value;

        const verifyCaptcha = await captcha.findOne({
          code,
          user: interaction.user.id,
        });

        if (!verifyCaptcha)
          return modalInteraction
            .reply({
              content: `${modalInteraction.client.config.emojis.redTick} Invalid captcha code. Try again.`,
              ephemeral: true,
            })
            .catch(() => {});

        modalInteraction.client.guilds.cache
          .get(modalInteraction.client.config.mainGuild)
          .members.cache.get(modalInteraction.user.id)
          .roles.add("590931208872132620")
          .catch((e) => {
            console.log(e);
          });

        await captcha.findOneAndDelete({ code: code });
        return modalInteraction
          .reply({
            content: `${modalInteraction.client.config.emojis.greenTick} Verified your account!`,
            ephemeral: true,
          })
          .catch((e) => {
            console.log(e);
          });
      })
      .catch((e) => {
        console.log(e);
      });
  }

  async start(interaction) {
    if (interaction.member.roles.cache.has("590931208872132620"))
      return interaction.deferUpdate();
    const user = await captcha.findOne({ user: interaction.user.id });
    if (user) return interaction.deferUpdate();
    const code = this.randomString();
    const verifyCaptcha = await new captcha({
      code: code,
      user: interaction.user.id,
    }).save();

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("captcha")
        .setLabel("Captcha")
        .setStyle("Secondary")
    );

    let dm = false;
    await interaction.user
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Captcha")
            .setDescription(
              `Hello, you're being sent this message to verify your identity with a captcha code. Click the button below and input the code to be verified!\n\n\`${code}\``
            ),
        ],
        components: [button],
      })
      .catch((e) => {
        dm = true;
      });

    if (dm) {
      await captcha.deleteOne({ user: interaction.user.id });
      return interaction.reply({
        ephemeral: true,
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
        .get("286252263109033984")
        .members.kick(interaction.user.id, "User did not complete captcha");
    }, 360000);

    interaction.deferUpdate();
  }
};
