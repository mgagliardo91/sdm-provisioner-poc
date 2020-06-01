# SDM UI Provisioner PoC

This repo is a PoC of UI extensibility via IFrames. There are three main components to it:

1. `server`: The backend component that will register third-party javascript and sandbox the javascript inside an HTML sandbox document upon request.
2. `client`: A simple React app used to _mock_ the SDM UI to demonstrate how context can be passed to an IFrame (`EmbeddedUI`)
3. `external/hello-world`: A simple React app used to mimic third-party UI that can receive context and be hosted by the provisioner.

## Background Context

This PoC is built off of the concept of SDM-hosted third-party UI (see [SDM UI Extensibility](https://docs.google.com/drawings/d/1GckQY8apTnxx13af5n7vyl6ASzHzLfeWIACOoIkTF1w/edit)). This PoC can be extended to support third-party hosted UI, but the main proof here is to show how we can communicate with a third-party UI (whether we host it or its hosted externally).

This concept relies on the backend component (`server`) which has two main REST endpoints:

- [POST] `/provision/{extension.point.name}/{appId}`

  Persists and associates the third-party bundle with the `appId` for the `extension.point.name` (i.e. `sdm.ui.widget`).
  
  - `name`: Custom name for the UI
  - `source`: The third-party javascript bundle

- [GET] `/provision/{extension.point.name}/{appId}/{name}`

  Retrieves the third-party bundle wrapped in a sandbox document template containing some helper methods (see `server/static/js/sdm-utils.js`).

## Get Started

1. Decript the `key.json`

```
cd ./key
gpg -d key.json.gpg > key.json
```

2. In one terminal, navigate to the `server` directory and run:

```
cd ./server
yarn
yarn start
```

This command will start up a docker-compose instance of `postgres` and start the provisioner. On the first attempt, it may take up to 30 seconds to initialize the database.

3. In another terminal, navigate to the `client` directory and run:

```
cd ./client
yarn
yarn start
```

You will now have the server (http://localhost:4000) and the client (http://localhost:3000) running. If you navigate to the client above, you will see four iframes on the screen with a description above each - each of these iframes are using the `EmbeddedUI` component and are meant to demonstrate a unique instance of hosted UI.

Since nothing has been provisioned, the four iframes will show a 404 in their body.

In [App.tsx](./client/src/App.tsx), you can find the structure of an `EmbeddedUI` component which looks like an iframe but has come capabilities for communicating with the iframe:

```js
...
<EmbeddedUI
  title="Bob UI"
  context={context}
  url="http://localhost:4000/provision/sdm.ui.widget/1234-1234566-123123/test.js?user=Bob" />
...
```

## Inflate the iframes with hosted UI

We are now going to inflate the iframes to demonstrate the three types of hosting that can occur:

 - The provisioner hosts some third-party javascript bundle and templates the iframe
 - The provisioner templates the iframe with an externally hosted javascript bundle
 - The provisioner redirects to an externally hosted application

### SDM-Hosted Customer JS Bundle, SDM-Sandbox

This case will inflate the first two iframes. The flow for this approach is that a customer wants to write javascript but does not have the resources/desire to host an app themselves. They create an app in SDM and then include a UI extension that contains the javascript source bundle. The SDM Provisioner will store this bundle and, upon subsequent GET requests for the extension, it will provide a sandbox for the bundle to run in. This sandbox will contain a utility javascript file that manages the communication between the client (_mock_ SDM) and the customer javascript.

1. In a third terminal, navigate to the [Hello World App](./external/hello-world) directory and build the bundle.

```
cd ./external/hello-world
yarn
yarn build
```

This command will create a javascript bundle available at `./build/js/main.<hash>.js`

2. Post the bundle to the provisioner:

```sh
curl --location --request POST 'http://localhost:4000/provision/sdm.ui.widget/1234-sdm-hosted' \
--form 'name=test' \
--form "source=@$(find ./build/js -type f -name "*.js")"
```

This request posts the bundle to an extension named `test` for the extension point `sdm.ui.widget` for the app ID `1234-sdm-hosted`.

3. Navigate back to the client UI and reload. You should now see the first two iframes loaded and start to show some data. If you open the developer tools, you can view the communication between the client UI and the iframe which uses `postMessage()` to handshake and pass context to the iframes. The data in the iframe is coming from the client UI - demonstrating passing context to third-party UI.

### Customer-Hosted JS Bundle, SDM-Sandbox

This case will inflate the third iframe. The concept here is that a customer can host the static javascript bundle externally, but does not want to host an entire application (this just has to be a publicly accessible link to the javascript bundle). The bundle is included in the resulting sandbox HTML as a resource alongside the same utility methods (not required to be included by the user).

1. Execute the following curl:

```
curl --location --request POST 'http://localhost:4000/provision/sdm.ui.widget/1234-customer-hosted' \
--form 'name=test' \
--form 'sourceUrl=http://localhost:5000/main.js'
```

This request posts the link to the bundle (`http://localhost:5000/main.js`) to an extension named `test` for the extension point `sdm.ui.widget` for the app ID `1234-customer-hosted`.

1. Now, in the terminal used to build the `Hello World` app in the previous step, start the application:

```
cd ./external/hello-world
yarn start
```

This command will open another client at http://localhost:5000. Ignore the client for now, the key is that the bundle is actually available at http://localhost:5000/main.js (this could just as easily been a link to a Google Drive file, etc).

3. Navigate back to the client UI. You should now see the third iframe loaded with data and updating with context. This frame contains the sandbox template with a direct link to the customer's javascript bundle. This bundle does not need to include the utility library as it's included in the sandbox.

### Customer-Hosted External App, No Sandbox

This case will inflate the fourth iframe. The concept is that we have a customer app that lives externally. Their extension just indicates to use this application at an external location and the responsibility of including the utility library is on the customer.

1. This step assumes you still have the `Hello World` client running, if not, go back and start it in the first step of the previous section. Execute the curl request:

```
curl --location --request POST 'http://localhost:4000/provision/sdm.ui.widget/1234-external-app' \
--form 'name=test' \
--form 'externalLocation=http://localhost:5000'
```

This request posts the location of the customer's application (`http://localhost:5000`) to an extension named `test` for the extension point `sdm.ui.widget` for the app ID `1234-external-app`.

2. Navigate back to the client UI and you should see the last iframe loading with context. If you look at the customer's application, their app had to include the utility library directly in order to enable the cross-window communication. With it, context passing is still enabled.

## Cleanup

1. Ctrl-C out of each node service started with `yarn start`. To stop the postgres instance:

```
cd ./server
yarn stop-pg
# yarn reset-pg <- Deletes the database volume
```

## Summary

This demo outlines a few different mechanisms for supporting UI extensibility. There are benefits/advantages to each mechanism, and the ideal solution may be a combination.

**SDM Sandbox:** By hosting the javascript bundles inside a sandbox, we can control the document that the extensible UI runs within, allowing us to add scripts/monitoring/functionality upon request and taking the responsibility off of the customer. Since we are constructing the document, it does put either limitations or more complexity around complicated customer UI whether they want to include CSS, custom HTML outside of their source code.

**External Customer App:** This is the truest of flexibility - we are purely embedding some external customer page. The customer would need to include libraries to enable communication between SDM and their embedded document, but outside of that, their app is completely theirs. 
