## Couchdb Notes

Ensure you have set the chatapi configs via the manager -> AI Configurations or in the `configurations` database in couchdb:

For model choices view:
  - Openai: https://platform.openai.com/docs/models
  - Perplexity: https://docs.perplexity.ai/models/model-cards
  - Deepseek: https://api-docs.deepseek.com/quick_start/pricing
  - Gemini: https://deepmind.google/technologies/gemini/

## Development Notes
Run `cd chatapi` and add a .env file in the `chatapi` directory with the following configs in the .env file(ensure the username & password match your admin credentials):
  ```
    SERVE_PORT=5000
    COUCHDB_HOST=http://localhost:2200
    COUCHDB_USER=planet
    COUCHDB_PASS=planet
  ```

By default(linux), the chatapi uses 5000 as the serve port. For *windows* and *macOS* users we recommend using `5400` as the serve port to avoid conflicts with other services.

While developing or testing, if you are using a different port number or 5400(windows & macOs users), use `npm run dev` instead of `ng s` and ensure that the `CHAT_PORT` in the root directory `.env` file is the same as the `SERVE_PORT` in the `/chatapi/.env` file.

To run the chatapi locally, you need to use node v18. You can use nvm(linux) or fnm(windows/macos) to manage your node versions. To start the chatapi:
```
  npm install
  nvm use 18
  npm run dev
```

**Note:** The dev(npm) chatapi by default runs on port 5000(linux) similar to the production(docker) environment. Therefore, only one of them can run at a time. To deactivate the production chatapi run `docker stop planet_chatapi_1(or container id)`

### Fatal error in chatapi using an arm32 device

If you are using an 32bit arm device and encounter a fatal error while running the chatapi container run the following:
```
  wget http://ftp.us.debian.org/debian/pool/main/libs/libseccomp/libseccomp2_2.5.1-1~bpo10+1_armhf.deb

  dpkg -i libseccomp2_2.5.1-1~bpo10+1_armhf.deb
```

## API Overview

### HTTP requests

##### GET /

**Description**: Returns a welcome message from the API.
**Response**: 
  - Status Code: 200 OK
  - Body: json
  ```
  {
    "status": "Success",
    "message": "OLE Chat API Service"
  }
  ```

##### POST /

**Description**: Sends a chat message with an option to save.
**Input**: JSON object in the request body with fields *data* (object) and *save* (boolean).
  Sample Input
  ```
  {
    "data": {
      "user": "admin",
      "content": "Hello",
      "assistant": false,
      "context": "",
      "aiProvider": {
        "name": "openai",
        "model"?: "gpt-3.5-turbo",
      },
      "_id"?: "0157cd109e2a6852a82e2b5da402e64b",
      "_rev"?: "2-ad3d40af8abdead9eef8a6aa6a8c6f87"
    },
    "save": true
  }
  ```
  Additional info on data:
  - **user**: string(required) -> Provide the planet/myPlanet username
  - **content**: string(required) -> The latest prompt for the AI to answer
  - **assistant**: boolean(required) -> Set to true if you want to use the assistants endpoint
  - **context**: string(optional) -> The text context you would like to pre-load the AI Assistant   with
  - **aiProvider**: Object(required)
    - **name**: string(required) -> Name of the API provider to choose from i.e openai, perplexity, deepseek or gemini.
    - **model**: string(optional) -> Name of the specific provider model to use.
  - **_id**: couchdb document id
  - **_rev**: couchdb revision id
  The couchdb id and rev are optional fields(only optional when starting a new chat), however to update an existing chat the id and rev (required) be provided.
  Take note that the rev changes each time the db document is updated.

**Response**: Varies depending on the outcome. Success response example:
  - Status Code: 201 Created
  - Body: json
  ```
  {
    "status": "Success",
    "chat": "How may I assist you today?",
    "couchDBResponse": {
        "ok": true,
        "id": "aee429dffc8e50ddeca9addf5a00beb8",
        "rev": "2-b97b95e0b32de4f0c622b0e5559c1671"
    }
  }
  ```

##### GET /checkproviders

**Description**: Checks the availability of AI providers supported.
**Response**:
  - Status Code: 200 OK
  - Body: json
  ```
  {
    "openai": true,
    "perplexity": true,
    "deepseek": true,
    "gemini": true
  }
  ```

---

### Websocket requests

**Description**: Establishes a WebSocket connection for real-time chat.
**Usage**: Connect via WebSocket and send JSON messages containing chat data. Responses will be provided through the WebSocket connection.
aiProviders supported: openai, perplexity, deepseek and gemini.
any provider model supported by the provider can be used.

- Request json sample
  ```
  {
      "user": "admin",
      "time": {},
      "content": "Hola",
      "aiProvider": {
          "name": "openai"
      }
  }
  ```


- Response json sample
if response is not final
  ```
  {
      "type": "partial",
      "response": "En"
  }
  ```


if response is final
  ```
  {
      "type": "final",
      "completionText": "¡Hola! ¿En qué puedo ayudarte hoy?",
      "couchDBResponse": {
          "ok": true,
          "id": "aee429dffc8e50ddeca9addf5a001402",
          "rev": "2-22a89c4b4e6a25c27cb41ac1ea042c3e"
      }
  }
  ```
