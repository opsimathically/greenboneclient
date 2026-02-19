import { GreenboneClient } from './src/classes/greenboneclient/GreenboneClient.class';

(async function () {
  const greenboneclient = new GreenboneClient();

  const connect_result = await greenboneclient.connect({
    auth: {
      username: process.env.GREENBONE_LIVE_USERNAME,
      password: process.env.GREENBONE_LIVE_PASSWORD
    },
    /* this could be a tcp type or a unix_socket type */
    connection: {
      type: 'tcp',
      host: '127.0.0.1',
      tcp_port: 5555
    }
  });

  if (!connect_result) {
    // error state, could not connect
    console.error(greenboneclient.getLastError());
    return;
  }

  const users = await greenboneclient.getAllUsers();
  const tasks = await greenboneclient.getAllTasks();
  const port_lists = await greenboneclient.getAllPortLists();
  await greenboneclient.disconnect();
  debugger;
})();
