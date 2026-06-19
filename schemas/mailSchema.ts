import { z } from 'zod';

const recipientSchema = z.object({
  email: z.string().email(),
  name:  z.string().max(200).optional(),
});

export const sendMailSchema = z.object({
  toEmail:  z.string().email('Invalid recipient email'),
  toName:   z.string().max(200).optional(),
  subject:  z.string().min(1).max(200),
  htmlBody: z.string().min(1).max(50000),
  cc:       z.array(recipientSchema).max(50).optional(),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;
