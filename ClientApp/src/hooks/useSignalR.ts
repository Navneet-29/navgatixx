import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalR = (bookingId: number | null) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/location')
      .withAutomaticReconnect()
      .build();

    newConnection.start()
      .then(() => {
        console.log('Connected to SignalR!');
        newConnection.invoke('JoinRide', bookingId);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    newConnection.on('driverLocationUpdated', (data) => {
      if (data && data.driverLatitude !== undefined && data.driverLongitude !== undefined) {
        setDriverLocation({ latitude: data.driverLatitude, longitude: data.driverLongitude });
      }
    });

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.off('driverLocationUpdated');
        newConnection.stop();
      }
    };
  }, [bookingId]);

  return { driverLocation, connection };
};
