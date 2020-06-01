import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMessageBus } from './MessageBus';

interface IEmbeddedUI {
  title: string;
  url: string;
  context: any;
}

const EmbeddedUI : React.FC<IEmbeddedUI> = ({ title, url, context }) => {
  const [id] = useState(uuidv4());
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const { subscribe } = useMessageBus();
  const ref = useRef<HTMLIFrameElement>();

  useEffect(() => {
    if (ready && context && ref.current) {
      const message = {
        type: 'UI_EXT:CONTEXT',
        __sdmMessage: true,
        payload: {
          target: id,
          context
        }
      }

      console.log(`[${id}]: Sending context`, context);;
      ref.current.contentWindow?.postMessage(message, "*");
    }
  }, [ready, context, id]);

  useEffect(() => {
    if (ref.current && loaded) {
      const message = {
        type: 'UI_EXT:INIT',
        __sdmMessage: true,
        payload: {
          target: id
        }
      }

      subscribe(id, (event: MessageEvent) => {
        const { type } = event.data;

        switch (type) {
          case 'UI_EXT:LOAD': {
            console.log(`[${id}]: External UI is loaded and ready`);
            setReady(true);
            break;
          }
        }
      }, { sourceFilter: id });

      console.log(`[${id}]: Initializing external UI with id ${id}`);
      ref.current.contentWindow?.postMessage(message, "*");
    }
  }, [ref, subscribe, id, loaded]);
  return (
    <iframe ref={val => {
      if (val) {
        ref.current = val;
      }
    }} onLoad={() => setLoaded(true)} title={title} id={id} width="200px" height="200px" src={url}></iframe>
  )
};

export default EmbeddedUI;