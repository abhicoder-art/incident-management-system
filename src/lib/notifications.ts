import axios from 'axios';

interface IncidentNotification {
  title: string;
  priority: string;
  timestamp: string;
}

export async function sendTelegramNotification(
  chatId: string,
  incident: IncidentNotification
): Promise<void> {
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('Telegram bot token is not configured');
    throw new Error('Telegram bot token is not configured');
  }

  const message = `🚨 New Incident Alert:\n\nTitle: ${incident.title}\nPriority: ${incident.priority}\nTime: ${incident.timestamp}`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }
    );

    if (response.data.ok) {
      console.log('Telegram notification sent successfully');
    } else {
      console.error('Failed to send Telegram notification:', response.data);
      throw new Error('Failed to send Telegram notification');
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Telegram API error: ${error.response?.data?.description || error.message}`);
    }
    throw error;
  }
} 