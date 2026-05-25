import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ?? '3000';

app.listen(Number(PORT), () => {
  console.log(`[ReviewBot] Server listening on port ${PORT}`);
  console.log(`[ReviewBot] NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);
});
