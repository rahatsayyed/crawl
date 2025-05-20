const { crawlWebsite } = require("./crawl.js");
const express = require("express");

const app = express();
app.use(express.json());
app.post("/crawl", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    const result = await crawlWebsite(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to crawl website" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
