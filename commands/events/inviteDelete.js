module.exports = async (client, invite) => {
  client.invites.delete(invite.code);
};
