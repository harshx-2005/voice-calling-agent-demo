const { createClient } = require("@deepgram/sdk");

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

async function transcribeAudio(audioUrl) {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      {
        model: "nova-2",       // Best free model
        smart_format: true,
        punctuate: true,
        language: "en-US",
      }
    );

    if (error) throw error;

    const transcript =
      result.results?.channels[0]?.alternatives[0]?.transcript || "";

    console.log("Transcribed:", transcript);
    return transcript;
  } catch (error) {
    console.error("Deepgram error:", error.message);
    return "";
  }
}

module.exports = { transcribeAudio };
