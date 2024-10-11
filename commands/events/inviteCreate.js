module.exports = async (client, invite) => {
  client.invites.set(invite.code, {
    uses: invite.uses,
    inviter: invite.inviter.id,
  });
};
