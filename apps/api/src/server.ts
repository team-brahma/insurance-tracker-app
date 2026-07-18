import './config/dotenv.js';
import cron from 'node-cron';
import { buildApp } from './app.js';
import { appConfig } from './config/index.js';
import { runRenewalNotificationJob } from './services/NotificationService.js';

/**
 * Server bootstrap.
 *
 * Builds and starts the Fastify application.
 * This is the process entry point.
 */
async function start(): Promise<void> {
  const app = await buildApp();

  try {
    // In cPanel, Passenger passes a Unix domain socket path or a dynamic port in process.env.PORT.
    // If it's a socket path (non-numeric string), we must listen on the file path.
    const passengerPort = process.env.PORT;
    let listenOptions: Record<string, any> = {
      port: appConfig.port,
      host: appConfig.host,
    };

    if (passengerPort) {
      if (isNaN(Number(passengerPort))) {
        listenOptions = { path: passengerPort };
      } else {
        listenOptions = { port: parseInt(passengerPort, 10), host: '0.0.0.0' };
      }
    }

    await app.listen(listenOptions);

    if (listenOptions.path) {
      app.log.info(`🚀 Server running on Passenger Unix socket: ${String(listenOptions.path)}`);
    } else {
      app.log.info(
        `🚀 Server running at http://${String(listenOptions.host)}:${String(listenOptions.port)}`,
      );
    }

    // ── Minutely renewal notification check ──────────────────────────────────
    // Checks every minute if there are any agents who want to receive reminders at the current time.
    cron.schedule('* * * * *', () => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const timeString = `${currentHour}:${currentMinute}`;

      runRenewalNotificationJob(timeString).catch((err: unknown) => {
        app.log.error(err, `[FCM] Renewal notification job failed for time ${timeString}`);
      });
    });
    app.log.info('[FCM] Renewal notification cron check scheduled every minute.');
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

void start();
