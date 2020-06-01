window.sdm = {
  subscriptions: {
    context: undefined
  },
  getUser: function() {
    return window.user
  },
  subscribeContext: function(listener) {
    window.sdm.subscriptions.context = listener;
    if (window.sdm.context) {
      listener(window.sdm.context);
    }
  }
}

window.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'UI_EXT:INIT': {
      window.sdmId = payload.target;
      console.log(`[${window.user}]: Received initialization from parent to use ID ${window.sdmId}. Sending response...`);
      window.top.postMessage({
        source: window.sdmId,
        __sdmMessage: true,
        type: 'UI_EXT:LOAD',
        payload: {
          message: 'Hello!'
        }
      }, '*');
      break;
    };
    case 'UI_EXT:CONTEXT': {
      console.log(`[${window.user}]: Received context from parent`, payload.context);
      window.sdm.context = payload.context;
      if (window.sdm.subscriptions.context) {
        window.sdm.subscriptions.context(window.sdm.context);
      }
      break;
    }
  }
  
}