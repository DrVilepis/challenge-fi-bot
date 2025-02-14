// eslint-disable-next-line no-unused-vars
const { Interaction } = require("discord.js")
const { createHash } = require("crypto")
const { performance } = require("perf_hooks")
const findMessage = require("../utils/find_message")
const checkForAccess = require("../utils/check_for_access")
const PatchedMessageEmbed = require("../utils/message_embed_patch")

/**
 * Some module
 * @param {Interaction} interaction
 * @param {Function} next If we will move on to the next handler
 */
module.exports = async (interaction, next) => {
    if (interaction.isCommand() && interaction.commandName === "info") {
        if (!(await checkForAccess(interaction))) {
            interaction.reply({
                content: "Permission denied.",
                ephemeral: true
            })
            return
        }
        await interaction.deferReply({
            ephemeral: true
        })

        let canTimeout = true
        setTimeout(() => {
            if (!canTimeout) return
            interaction.followUp({
                content: "The execution of `/info` can at most take **a few minutes**. Please wait...",
                ephemeral: true
            })
        }, 5000)

        const atExecution = performance.now()

        const roleSelection = await global.schemas.RoleSelectionModel.find({ id: interaction.guild.id }).exec()
        const polls = await global.schemas.PollModel.find({ id: interaction.guild.id }).exec()
        let ctfdIntegration = await global.schemas.CTFdIntegrationModel.findOne({ id: interaction.guild.id }).exec()
        if (ctfdIntegration === null) ctfdIntegration = {}

        const atQueryComplete = performance.now()
        const queryTimeTaken = atQueryComplete - atExecution

        const roleSelectionData = roleSelection.length !== 0 ? (await Promise.all(roleSelection.map(async (document) => (await findMessage(document.message, interaction.guild))?.url ?? "invalid-message"))).join(", ") : "none"
        const pollData = polls.length !== 0 ? (await Promise.all(polls.map(async (document) => (await findMessage(document.message, interaction.guild))?.url ?? "invalid-message"))).join(" ") : "none"

        const afterMessageQuery = performance.now()
        const messageQueryTimeTaken = afterMessageQuery - atQueryComplete

        const embed = new PatchedMessageEmbed()
            .setAuthor("Server configuration")
            .setTitle(interaction.guild.name)
            .setColor("#667bc4")
            .setThumbnail(interaction.guild.iconURL())
            .addField("Role selection(s)", `
                Messages: ${roleSelectionData}
            `)
            .addField("Poll(s)", `
                Messages: ${pollData}
            `)
            .addField("CTFd integration", `
                CTFd API URL: \`${ctfdIntegration.apiUrl ?? "none"}\`
                CTFd API Token SHA256 hash: \`${ctfdIntegration.apiToken !== null && ctfdIntegration.apiToken !== undefined ? createHash("sha256").update(ctfdIntegration.apiToken).digest("hex") : "none"}\`
                CTFd challenge notification channel: <#${ctfdIntegration.challengeNotifications ?? "none"}>
                CTFd solve notification channel: <#${ctfdIntegration.solveNotifications ?? "none"}>
            `)
            .addField("Performance", `
                \`\`\`
                Ping:               ~${Math.round(global.client.ws.ping)} ms
                Database:           ~${Math.round(queryTimeTaken)} ms
                Message queries:    ~${Math.round(messageQueryTimeTaken)} ms
                \`\`\`
                Total: \`~${Math.round(afterMessageQuery - atExecution + global.client.ws.ping)}\` ms
            `)
        canTimeout = false
        interaction.followUp({
            ephemeral: true,
            embeds: [embed]
        })
    } else {
        next()
    }
}
