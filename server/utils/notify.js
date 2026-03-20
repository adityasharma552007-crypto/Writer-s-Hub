const { supabase } = require('../supabaseClient');

const createNotification = async ({ recipient, sender, type, message, link }) => {
    // Don't notify yourself
    if (recipient === sender) return;

    try {
        const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
                recipient,
                sender,
                type,
                message,
                link: link || ''
            })
            .select()
            .single();
            
        if (error) throw error;
        return notification;
    } catch (error) {
        console.error('Notification creation error:', error.message);
    }
};
module.exports = { createNotification };
