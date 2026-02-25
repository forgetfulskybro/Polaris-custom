module.exports = {
  metadata: {
    name: "button:popularCommand",
  },
  
  async run(client, int, tools) {
    return int.deferUpdate();
  }
}