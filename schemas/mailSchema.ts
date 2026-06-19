import { z } from 'zod';

const recipientSchema = z.object({
  email: z.string().email(),
  name:  z.string().max(200).optional(),
});

const attachmentSchema = z.object({
  name:         z.string().min(1).max(255),
  contentType:  z.string().min(1).max(100),
  contentBytes: z.string().min(1), // base64-encoded file content
});

export const sendMailSchema = z.object({
  toEmail:     z.string().email('Invalid recipient email'),
  toName:      z.string().max(200).optional(),
  subject:     z.string().min(1).max(200),
  htmlBody:    z.string().min(1).max(50000),
  cc:          z.array(recipientSchema).max(50).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;
