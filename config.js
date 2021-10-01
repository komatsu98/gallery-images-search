require('dotenv').config()

module.exports = {
    settings: {
        voiceStyle: {
            "lang": "Malayalam (India)",
            "voice_type": "Wavenet",
            "gender": "FEMALE",
            "voice_name": "ml-IN-Wavenet-A",
            "speed_slider": 1.0,
            "pitch_slider": 1.0
        },
        maxCharacter: 100
    },

    googleAPIKey: process.env.GOOGLE_API_CREDENTIAL_KEY
}