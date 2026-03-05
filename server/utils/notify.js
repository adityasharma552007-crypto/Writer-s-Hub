const Notification = require('../models/Notification');

const createNotification = async ({ recipient, sender, type, message, link }) => {
    // Don't notify yourself
    if (recipient.toString() === sender?.toString()) return;

    try {
        const notification = await Notification.create({
            recipient,
            sender,
            type,
            message,
            link
        });
        return notification;
    } catch (error) {
        console.error('Notification creation error:', error.message);
    }
};

module.exports = { createNotification };
