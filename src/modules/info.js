// eslint-disable-next-line no-unused-vars
const { Interaction, MessageEmbed } = require("discord.js")
const findMessage = require("../utils/find_message")
const checkForAccess = require("../utils/check_for_access")
const { createHash } = require("crypto")

/**
 * Some module
 * @param {Interaction} interaction
 * @param {Function} next If we will move on to the next handler
 */
module.exports = async (interaction, next) => {
    if (interaction.isCommand() && interaction.commandName === "info") {
        if (!checkForAccess(interaction)) {
            interaction.reply({
                content: "Permission denied.",
                ephemeral: true
            })
            return
        }
        await interaction.deferReply({
            ephemeral: true
        })
        const roleSelection = await global.schemas.RoleSelectionModel.findOne({ id: interaction.guild.id }).exec()
        let ctfdIntegration = await global.schemas.CTFdIntegrationModel.findOne({ id: interaction.guild.id }).exec()
        if (ctfdIntegration === null) ctfdIntegration = {}

        const embed = new MessageEmbed()
            .setAuthor("Server configuration")
            .setTitle(interaction.guild.name)
            .setColor("#667bc4")
            .setThumbnail(interaction.guild.iconURL())
            .addField("Role selection", `
                Message: ${roleSelection !== null ? (await findMessage(roleSelection.message, interaction.guild)).url : "none"}
            `)
            .addField("CTFd integration", `
                CTFd API URL: ${ctfdIntegration.apiUrl ?? "none"}
                CTFd API Token SHA256 hash: ${ctfdIntegration.apiToken !== null ? createHash("sha256").update(ctfdIntegration.token).digest("hex") : "none"}
                CTFd challenge notification channel: <#${ctfdIntegration.challengeNotifications ?? "none"}>
                CTFd solve notification channel: <#${ctfdIntegration.solveNotifications ?? "none"}>
            `)
        interaction.followUp({
            ephemeral: true,
            embeds: [embed]
        })
    } else {
        next()
    }
}
