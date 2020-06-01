import React, { useState, useEffect } from 'react';
import EmbeddedUI from './components/EmbeddedUI';
import MessageBusProvider from './components/MessageBus';

function App() {
  const [context, setContext] = useState<any>({ hello: true, timer: 0 });

  useEffect(() => {
    const int = setInterval(() => {
      setContext(({ timer }: any) => {
        return {
          hello: (timer + 1) % 5 === 0 ? true : false,
          timer: timer + 1
        }
      });
    }, 1000);

    return () => {
      clearInterval(int);
    }
  }, []);

  return (
    <div className="App" style={{padding: '1em'}}>
      <MessageBusProvider>
        <h3>SDM-Provisioned (hosted) JS 1:</h3>
        <p>This iframe is templated and hosted by the provisioner</p>
        <EmbeddedUI
          title="Bob UI"
          context={context}
          url="http://localhost:4000/provision/sdm.ui.widget/1234-sdm-hosted/test?user=Bob" />
        <h3>SDM-Provisioned (hosted) JS 2:</h3>
        <p>This is the same js as above, but can be passed different context or parameters</p>
        <EmbeddedUI
          title="Mike UI"
          context={context}
          url="http://localhost:4000/provision/sdm.ui.widget/1234-sdm-hosted/test?user=Mike" />
        <h3>Externally Hosted JS:</h3>
        <p>This javascript file is hosted externally, but still templated by the provisioner</p>
        <EmbeddedUI
          title="External Hosted UI"
          context={context}
          url="http://localhost:4000/provision/sdm.ui.widget/1234-customer-hosted/test?user=External" />
        <h3>Externally Hosted App:</h3>
        <p>This entire iframe points to a separate web server/app. Utility file is required by this app to obtain context.</p>
        <EmbeddedUI
          title="External Hosted UI"
          context={context}
          url="http://localhost:4000/provision/sdm.ui.widget/1234-external-app/test" />
      </MessageBusProvider>
    </div>
  );
}

export default App;
