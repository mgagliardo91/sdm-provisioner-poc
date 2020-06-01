import React, { createContext, useState, useCallback, useContext, useEffect, useRef } from 'react';

type ISdmMessage = {
  __sdmMessage: boolean;
  type: string;
  source: string;
  payload: any;
}

interface ISdmMessageEvent extends MessageEvent {
  readonly data : ISdmMessage;
}

type ICallbackFunction = (event: ISdmMessageEvent) => void;

type ISubscribeFilter = (event: ISdmMessageEvent) => boolean;

interface ISubscribeOptions {
  typeFilter?: string;
  originFilter?: string;
  sourceFilter?: string;
  filters?: ISubscribeFilter[];
}

interface IMessageBusContext {
  subscribe(id: string, callback: ICallbackFunction, opts?: ISubscribeOptions): void;
  unsubscribe(id: string): void;
}

const defaultValue: IMessageBusContext = {
  subscribe: () => { throw new Error('Context is not yet instantiated.') },
  unsubscribe: () => { throw new Error('Context is not yet instantiated.') }
}

const MessageBusContext = createContext<IMessageBusContext>(defaultValue);

type ISubscriptions = { [id: string]: ICallbackFunction };

const createCallbackFilter = (callback: ICallbackFunction, opts: ISubscribeOptions = {}): ICallbackFunction => {
  const { originFilter, sourceFilter, typeFilter, filters = [] } = opts;
  const callbackFilters: ISubscribeFilter[] = [...filters];
  if (originFilter && originFilter !== '') {
    filters.push((event) => event.origin === originFilter);
  }

  if (sourceFilter && sourceFilter !== '') {
    filters.push((event) => event.data.source === sourceFilter);
  }

  if (typeFilter && typeFilter !== '') {
    filters.push((event) => event.data.type === typeFilter);
  }

  if (!callbackFilters.length) {
    return callback;
  }

  return (event: ISdmMessageEvent) => {
    if (callbackFilters.every(filter => filter(event))) {
      callback(event);
    }
  }
}

const MessageBusProvider : React.FC<{}> = ({ children }) => {
  const [ subscriptions, setSubscriptions ] = useState<ISubscriptions>({});
  const messageHandler = useRef<{ (event: MessageEvent): void }>();

  useEffect(() => {
    messageHandler.current = (event: MessageEvent) => {
      const message = event.data as ISdmMessage;

      if (!message.__sdmMessage) {
        return;
      }

      console.log('Received event', event);
      console.log('Current state of subscriptions', subscriptions);

      try {
        Object.values(subscriptions).forEach(callback => callback(event as ISdmMessageEvent));
      } catch (e) {
        return;
      }
    };
  }, [messageHandler, subscriptions]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => messageHandler.current && messageHandler.current(event);
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    }
  }, []);

  const subscribe = useCallback((id: string, callback: ICallbackFunction, opts: ISubscribeOptions = {}) => {
    setSubscriptions(currentSubscriptions => {
      currentSubscriptions[id] = createCallbackFilter(callback, opts);
      return currentSubscriptions;
    });
  }, []);

  const unsubscribe = useCallback((id: string) => {
    setSubscriptions(currentSubscriptions => {
      delete currentSubscriptions[id];
      return currentSubscriptions;
    });
  }, []);

  return <MessageBusContext.Provider value={{ subscribe, unsubscribe }}>
    { children }
  </MessageBusContext.Provider>
};

export default MessageBusProvider;

export const useMessageBus = () => useContext(MessageBusContext);