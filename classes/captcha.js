const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");
const captcha = require("../models/captcha.js");
const crypto = require("node:crypto");

module.exports = class Captcha {
  randomString(length = 20) {
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
              max_length: 20,
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

    const embed = new ContainerBuilder()
      .setAccentColor(0x0099ff)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `Hello, you're being sent this message to verify your identity with a captcha code. Click the button below and input the code to be verified!\n\n\`${code}\``,
        ),
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId("captcha")
            .setLabel("Captcha")
            .setStyle("Secondary"),
        ),
      );

    let dm = false;
    await interaction.user
      .send({
        components: [embed],
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
