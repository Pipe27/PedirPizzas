'use strict';

const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const orderedPizzasMetadataManager = require('./orderedPizzasMetadataManager');
const QUEUE_URL = process.env.PENDING_ORDER_QUEUE;
var sqs = new AWS.SQS({ region: process.env.REGION });

module.exports.hacerPedido = (event, context, callback) => {
    const body = JSON.parse(event.body);
    const orderedPizza = {
        orderId: uuidv4(),
        name: body.name,
        address: body.address,
        pizzas: body.pizzas,
        date: Date.now()
    };
    const params = {
        MessageBody: JSON.stringify(orderedPizza),
        QueueUrl: QUEUE_URL
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) {
            sendResponse(500, err, callback);
        } else {
            const message = {
                order: orderedPizza,
                messageId: `El mensaje tiene el id: ${data.MessageId}`
            };
            sendResponse(200, message, callback);
        }
    });
};

module.exports.prepararPedido = (event, context, callback) => {
    console.log('Se está preparando el pedido');
    const orderedPizza = JSON.parse(event.Records[0].body);
    orderedPizzasMetadataManager.saveCompletedOrder(orderedPizza).then(data => {
        callback();
    }).catch(err => {
        callback(err);
    });
    callback();
};

module.exports.enviarPedido = (event, context, callback) => {
    console.log('Se va a enviar el pedido');
    const record = event.Records[0];
    if (record.eventName == 'INSERT') {
        console.log('deliverOrder');
        const orderId = record.dynamodb.Keys.orderId.S;
        orderedPizzasMetadataManager.deliverOrder(orderId).then(data => {
            console.log(data);
            callback();
        }).catch(err => {
            callback(err);
        });
    } else {
        console.log('No es un pedido nuevo');
        callback();
    }
};

module.exports.estadoPedido = (event, context, callback) => {
    console.log('Consultando pedido');
    const orderId = event.pathParameters && event.pathParameters.orderId;
    if (orderId !== null) {
        orderedPizzasMetadataManager.getOrder(orderId).then(order => {
            sendResponse(200, `La orden: ${orderId} se encuentra en estado: ${order.delivery_status}`, callback);
        }).catch(error => {
            sendResponse(500, 'Hubo un error al procesar el pedido', callback);
        });
    } else {
        sendResponse(400, 'No se envió un orderId para consultar', callback);
    }
};

function sendResponse(statusCode, message, callback) {
    const response = {
        statusCode: statusCode,
        body: JSON.stringify(message)
    };
    callback(null, response);
}