require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { Configuration, OpenAIApi } = require("openai");

app.use(cors());
app.use(express.json());
app.use(express.static("build"));

app.get("/api/image", (req, res) => {
  const configuration = new Configuration({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    });
  const openai = new OpenAIApi(configuration);

  async function generateImage(imageDescription, imageSize) {
    const response = await openai.createImage({
        prompt: imageDescription,
        n: 1,
        size: imageSize,
      });

    console.log(response.data)
    const image_url = response.data.data[0].url;
    return image_url
  }
  const imageDescription = req.query.imageDescription;
  const imageSize = req.query.imageSize;
  generateImage(imageDescription, imageSize).then(imageURL => {
    return res.status(200).json({url: imageURL})
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
