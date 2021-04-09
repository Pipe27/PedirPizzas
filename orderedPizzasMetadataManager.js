'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.saveCompletedOrder = orderedPizzas => {
    orderedPizzas.delivery_status = 'READY FOR DELIVERY';
    const params = {
        TableName: process.env.ORDERED_PIZZAS_TABLE,
        Item: orderedPizzas
    };
    console.log('Se almacenó la orden en base de datos');
    return dynamo.put(params).promise();
};

module.exports.deliverOrder = orderId => {
    console.log('Enviar una orden fue llamado');
    const params = {
        TableName: process.env.ORDERED_PIZZAS_TABLE,
        Key: {
            orderId
        },
        ConditionExpression: 'attribute_exists(orderId)',
        UpdateExpression: 'set delivery_status = :newState',
        ExpressionAttributeValues: {
            ':newState': 'DELIVERED'
        },
        ReturnValues: 'ALL_NEW'
    };

    return dynamo.update(params).promise().then(response => {
        console.log('Orden entregada');
        return response.Attributes;
    });
};

module.exports.getOrder = orderId => {
    console.log('Revisar pedido fue llamado');

    const params = {
        TableName: process.env.ORDERED_PIZZAS_TABLE,
        Key: {
            orderId
        }
    };

    return dynamo.get(params).promise().then(item => {
        return item.Item;
    });
};