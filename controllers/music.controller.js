const axios = require("axios");

// 🔍 Search Lagu menggunakan iTunes Search API (Free, No Key Required)
const searchMusic = async (req, res) => {
  try {
    const query = req.query.search;
    if (!query) {
      return res.status(400).json({ error: "Query tidak boleh kosong" });
    }

    // Menggunakan iTunes Search API
    const response = await axios.get("https://itunes.apple.com/search", {
      headers: {
        "User-Agent": "ConnectTeen/1.0",
      },
      params: {
        term: query,
        media: "music",
        // Hapus entity: "song" agar lebih fleksibel atau pastikan tetap ada
        limit: 10,
      },
    });

    const songs = response.data.results.map((track) => ({
      id: track.trackId?.toString() || Math.random().toString(),
      name: track.trackName || "Unknown Title",
      artist: track.artistName || "Unknown Artist",
      image: track.artworkUrl100?.replace("100x100bb", "600x600bb") || null,
      preview_url: track.previewUrl || null,
    }));

    res.json({
      success: true,
      data: songs,
    });
  } catch (error) {
    console.error("[ITUNES_SEARCH_ERROR]", error.message);
    if (error.response) {
      console.error("[ITUNES_API_STATUS]", error.response.status);
      console.error("[ITUNES_API_DATA]", error.response.data);
    }
    res.status(500).json({ 
      success: false,
      error: "Gagal mencari musik",
      details: error.message 
    });
  }
};

module.exports = {
  searchMusic,
};
