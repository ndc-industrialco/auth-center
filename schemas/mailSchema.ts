import { z } from 'zod';

export const sendMailSchema = z.object({
  toEmail:  z.string().email('Invalid recipient email'),
  toName:   z.string().max(200).optional(),
  subject:  z.string().min(1).max(200),
  htmlBody: z.string().min(1).max(50000),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;
