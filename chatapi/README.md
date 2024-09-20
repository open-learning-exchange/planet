## Couchdb Notes

Ensure you have set the following configs in the `configurations` database in couchdb:

  ```
    "keys": {
      "openai": "sk-mm",
      "perplexity": "pplx-21",
      "gemini": "AIza"
    },
    "models": {
      "openai": "gpt-3.5-turbo",
      "perplexity": "llama-3-sonar-small-32k-online",
      "gemini": "gemini-pro"
    },
    "assistant": {
      "name": "Planet Context",
      "instructions": "You are a brainstorming manager for Open Learning Exchange (OLE) - https://ole.org/, you have specialised knowledge in Planet(web app) and myPlanet(mobile app) applications developed by OLE. You are designed to generate innovative ideas and provide suggestions and help the community members so as to ensure OLE's mission of empowering communities. Emphasize on terms like 'learning,' 'learner,' 'coach,' 'leader,' 'community,' 'power,' 'team,' and 'enterprises,' and avoids overly technical jargon. You are to embody OLE's ethos of self-reliance, mentoring, and community leadership, steering clear of concepts that contradict these values. Communicates in a formal tone, treating users with respect and professionalism, and maintaining a supportive, solution-oriented approach. Ask for clarifications when necessary to ensure contributions are accurate and relevant, and always encourages community-focused, empowering brainstorming."
    }
  ```

Note: This applies for both production and development environments.

## Development Notes
For development environment add a .env file in the `chatapi` directory

Add the following configs in the .env file:
  ```
    SERVE_PORT=5000
    COUCHDB_HOST=http://localhost:2200
    COUCHDB_USER=username
    COUCHDB_PASS=password
  ```

In the production environment these configs are set in the `planet.yml` file.

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
    - **name**: string(required) -> Name of the API provider to choose from i.e openai, perplexity or gemini.
    - **model**: string(optional) -> Name of the specific provider model to use. Defaults to gpt-3.5-turbo for _openai_, llama-3-sonar-small-32k-online	for _peplexity_ and gemini-pro for _google gemini_
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
    "perplexity": false,
    "gemini": true
  }
  ```

---

### Websocket requests

**Description**: Establishes a WebSocket connection for real-time chat.
**Usage**: Connect via WebSocket and send JSON messages containing chat data. Responses will be provided through the WebSocket connection.
aiProviders supported: openai, perplexity, and gemini.
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
