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

const mailFolderSchema = z.enum([
  'inbox',
  'sentitems',
  'archive',
  'deleteditems',
  'drafts',
  'junkemail',
]);

export const searchMailSchema = z.object({
  appId: z.string().trim().min(1).max(100),
  folder: mailFolderSchema.default('inbox'),
  // Real Graph folder id from GET /mail/folders — overrides `folder` when set,
  // so custom (non-well-known) folders are searchable too.
  folderId: z.string().trim().min(1).max(300).optional(),
  fromEmail: z.string().trim().email().optional(),
  keyword: z.string().trim().min(1).max(200).optional(),
  fromDate: z.iso.datetime({ offset: true }).optional(),
  toDate: z.iso.datetime({ offset: true }).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
}).superRefine((value, ctx) => {
  if (value.fromDate && value.toDate && value.fromDate > value.toDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['toDate'],
      message: 'toDate must be greater than or equal to fromDate',
    });
  }
});

export type SearchMailInput = z.infer<typeof searchMailSchema>;
