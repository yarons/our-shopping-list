const SERVER_VERSION = process.env.APP_VERSION   || 'dev';
const SERVER_BUILD_ID = process.env.APP_BUILD_ID || '(unknown)';

const {createProxyMiddleware} = require("http-proxy-middleware");

const {app, io} = require('./app');
const Board = require('./board/model');
const List = require('./list/model');
const Item = require('./item/model');

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.conn.once('upgrade', () => {
    console.log(`Client ${socket.id} upgraded transport:`, socket.conn.transport.name);
  });

  socket.conn.on("close", (reason) => {
    console.log(`Client ${socket.id} closed connection |`, reason);
  });

  socket.on('hello', (data, callback) => {
    console.log(`New connection from client ${socket.id}`, data)
    callback({
      serverString: `OSL Server (${SERVER_VERSION}-${SERVER_BUILD_ID})`,
      version: SERVER_VERSION,
      buildId: SERVER_BUILD_ID
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('join-board', (boardId, callback) => {
    console.log(`Client ${socket.id} joining board ${boardId}`);
    socket.join(`board/${boardId}`)
    if (callback) {
      callback({
        status: 'OK',
        message: `Joined board ${boardId}`
      })
    }
  });

  socket.on('leave-board', (boardId, callback) => {
    console.log(`Client ${socket.id} leaving board ${boardId}`);
    socket.leave(`board/${boardId}`)
    if (callback) {
      callback({
        status: 'OK',
        message: `Left board ${boardId}`
      })
    }
  });
});

// Proxify Node WS to Webpack server in developer mode
app.use('/sockjs-node', createProxyMiddleware(
  '/sockjs-node', {
    target: 'ws://localhost:8081',
    ws: true,
  }
));

/**
 * @return {String|null}
 */
const findParentBoardId = async function(model) {
  switch (true) {
    case model instanceof Board:
      //console.log('model instanceof Board', model);
      return model._id;

    case model instanceof List:
      //console.log('model instanceof List', model);
      return model.boardId;

    case model instanceof Item:
      //console.log('model instanceof Item', model);
      return findParentBoardId(
        await List.findOne({
            _id: model.listId
          })
          .exec()
      );

    default:
      // No parent board for this model
      return null;
  }
}

module.exports = {
  async notifyModelUpdate(modelType, model) {
    console.log('notifyModelUpdate', modelType, model);

    findParentBoardId(model).then(async (parentBoardId) => {
      if (parentBoardId) {
        console.log('Found parent board ID for updated model', model, parentBoardId);
        io.to(`board/${parentBoardId}`).emit('model-update', {
          type: modelType,
          model
        });
      }
    });
  },
  async notifyModelDelete(modelType, model) {
    console.log('notifyModelDelete', modelType, model);

    findParentBoardId(model).then(async (parentBoardId) => {
      if (parentBoardId) {
        console.log('Found parent board ID for deleted model', model, parentBoardId);
        io.to(`board/${parentBoardId}`).emit('model-delete', {
          type: modelType,
          model
        });
      }
    });
  }
}
